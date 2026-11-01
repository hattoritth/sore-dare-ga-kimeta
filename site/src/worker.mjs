/* Sites-compatible Worker entry candidate. Requires DB (D1) and ASSETS binding. */
import '../public/engine.js';
import {svgForUrl} from './qr.mjs';
const Engine=globalThis.MachiEngine;
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,'content-type':'application/json; charset=utf-8',...extra}});
const clone=x=>JSON.parse(JSON.stringify(x));
const paused=ms=>new Promise(r=>setTimeout(r,ms));
async function load(DB){
  const row=await DB.prepare('SELECT version, json FROM city_state_stage4 WHERE id=1').first();
  if(row)return {version:Number(row.version),game:JSON.parse(row.json)};
  const seed=Engine.createGame();
  await DB.prepare('INSERT OR IGNORE INTO city_state_stage4 (id, version, json) VALUES (1,0,?)').bind(JSON.stringify(seed)).run();
  const inserted=await DB.prepare('SELECT version, json FROM city_state_stage4 WHERE id=1').first();
  if(!inserted)throw Error('D1 initialization failed');
  return {version:Number(inserted.version),game:JSON.parse(inserted.json)};
}
async function transaction(DB,transform){
  for(let retry=0;retry<12;retry++){
    const {version,game}=await load(DB);
    const now=Date.now();
    const step=Engine.advance(game,now);
    let changed=step===true;
    let current=step==='restart'?Engine.createGame(now):game;
    if(step==='restart')changed=true;
    const result=transform(current,now);
    if(result?.changed)changed=true;
    if(!changed)return {game:current,result};
    const written=await DB.prepare('UPDATE city_state_stage4 SET json=?, version=version+1 WHERE id=1 AND version=?').bind(JSON.stringify(current),version).run();
    if(Number(written?.meta?.changes||0)===1)return {game:current,result};
    await paused(Math.min(30,retry*3));
  }
  throw Error('simultaneous update contention');
}
const cookie=req=>{const m=/(?:^|;\s*)machi_guest=([a-f0-9-]{36})(?:;|$)/.exec(req.headers.get('cookie')||'');return m?m[1]:null;};
function isSameOrigin(req){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
async function body(req){if(Number(req.headers.get('content-length')||0)>4096)throw Error('too large');const raw=await req.text();if(raw.length>4096)throw Error('too large');return JSON.parse(raw||'{}');}
function svg(url){return new Response(svgForUrl(url),{headers:{...headers,'content-type':'image/svg+xml; charset=utf-8'}});}
export default {
 async fetch(req,env){
  try{
   const url=new URL(req.url),path=url.pathname;
   if(path==='/api/health')return json({status:'ok',storage:!!env.DB});
   if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
   if(!env.DB)return json({error:'DB binding not configured'},503);
   if(path==='/api/state'&&req.method==='GET'){
    const k=cookie(req);
    const {game}=await transaction(env.DB,(g,now)=>{
     const participant=k&&g.participants[k];
     if(participant&&now-participant.lastSeen>12000){participant.lastSeen=now;return {changed:true};}
     return {changed:false};
    });
    return json(Engine.publicState(game,k||''));
   }
   if(path==='/api/join'&&req.method==='POST'){
    if(!isSameOrigin(req))return json({error:'invalid origin'},403);
    const data=await body(req);const existing=cookie(req);
    const key=existing||crypto.randomUUID();
    const {game,result}=await transaction(env.DB,(g,now)=>{
      if(!g.participants[key]&&Object.keys(g.participants).length>=150)return {changed:false,error:'参加人数の上限に達しました。'};
      if(!Engine.join(g,key,data.name,now))return {changed:false,error:'この街は結末を迎えました。次の街で参加できます。'};
      return {changed:true};
    });
    if(result?.error)return json({error:result.error},409);
    return json({ok:true,state:Engine.publicState(game,key)},200,{'set-cookie':`machi_guest=${key}; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=86400`});
   }
   if(path==='/api/ready'&&req.method==='POST'){
    if(!isSameOrigin(req))return json({error:'invalid origin'},403);
    const data=await body(req),k=cookie(req);
    const {game,result}=await transaction(env.DB,(g,now)=>{
     if(!k||!Engine.ready(g,k,data.ready,now))return {changed:false,error:'参加待機中に準備状態を変更してください。'};
     return {changed:true};
    });
    if(result?.error)return json({error:result.error},409);
    return json({ok:true,state:Engine.publicState(game,k)});
   }
   if(path==='/api/start'&&req.method==='POST'){
    if(!isSameOrigin(req))return json({error:'invalid origin'},403);
    const k=cookie(req);
    const {game,result}=await transaction(env.DB,(g,now)=>{
     if(!k||!g.participants[k]?.ready||!Engine.start(g,now))return {changed:false,error:'接続中の参加者全員が「準備OK」にしてから開始してください。'};
     return {changed:true};
    });
    if(result?.error)return json({error:result.error},409);
    return json({ok:true,state:Engine.publicState(game,k)});
   }
   if(path==='/api/vote'&&req.method==='POST'){
    if(!isSameOrigin(req))return json({error:'invalid origin'},403);
    const data=await body(req),k=cookie(req);
    const {game,result}=await transaction(env.DB,(g,now)=>{
     if(!Number.isInteger(data.round)||data.round!==g.round)return {changed:false,error:'議題が変わりました。もう一度選んでください。'};
     if(g.phase!=='active'||!['human','ai'].includes(data.choice))return {changed:false,error:'投票を受け付けられませんでした。'};
     const participant=k&&g.participants[k];
     if(!participant)return {changed:false,error:'投票を受け付けられませんでした。'};
     if(g.votes[k]===data.choice)return {changed:false};
     if(participant.lastVoteAt&&now-participant.lastVoteAt<750)return {changed:false,error:'少し待ってから選び直してください。'};
     if(!Engine.vote(g,k,data.choice,now))return {changed:false,error:'投票を受け付けられませんでした。'};
     participant.lastVoteAt=now;
     return {changed:true};
    });
    if(result?.error)return json({error:result.error},409);
    return json({ok:true,state:Engine.publicState(game,k)});
   }
   if(path==='/api/qr.svg'&&req.method==='GET'){
    const target=url.searchParams.get('url')||'';
    if(target.length>700)return json({error:'invalid URL'},400);
    const dest=new URL(target);
    if(!['https:','http:'].includes(dest.protocol)||dest.origin!==url.origin||!['/','/index.html'].includes(dest.pathname)||!['','?mode=group'].includes(dest.search)||dest.hash)return json({error:'invalid URL'},400);
    return svg(target);
   }
   return json({error:'not found'},404);
  }catch(err){const busy=err?.message==='simultaneous update contention';return json({error:busy?'混雑しています。少し待ってやり直してください。':'リクエストを処理できませんでした。'},busy?503:400);}
 }
};
