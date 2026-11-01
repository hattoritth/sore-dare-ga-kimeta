/** Local multi-device exhibition server. Run: node server.mjs. External publishing is separate. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
import {svgForUrl} from './src/qr.mjs';
const require=createRequire(import.meta.url);
const Engine=require('./engine.js');
const root=path.dirname(fileURLToPath(import.meta.url));
const pub=path.join(root,'public');
const PORT=Number(process.env.PORT||4173);
const HOST=process.env.HOST||'0.0.0.0';
const persist=process.env.DATA_PATH?path.resolve(process.env.DATA_PATH):path.join(root,'city-state.json');
let game=Engine.createGame();
try{const x=JSON.parse(fs.readFileSync(persist,'utf8'));if(x&&x.phase&&x.public&&x.shadow&&x.participants)game=x;}catch{}
let changed=false;
const save=()=>{if(changed){try{fs.writeFileSync(persist,JSON.stringify(game));changed=false;}catch(e){console.error('save error:',e.message);}}};
setInterval(()=>{const a=Engine.advance(game);if(a==='restart'){game=Engine.createGame();changed=true;}else if(a)changed=true;save();},350).unref();
const send=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));};
const readJson=async req=>new Promise((resolve,reject)=>{let str='';req.on('data',x=>{str+=x;if(str.length>4096){reject(Error('too large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(str||'{}'));}catch{reject(Error('bad json'));}});req.on('error',reject);});
const visitorKey=req=>{const c=req.headers.cookie||'';const m=/(?:^|;\s*)machi_guest=([a-f0-9-]{36})/.exec(c);return m?m[1]:null;};
const sameOrigin=req=>{const origin=req.headers.origin;if(!origin)return true;try{const url=new URL(origin);return ['http:','https:'].includes(url.protocol)&&url.host===req.headers.host;}catch{return false;}};
const noStore={'Cache-Control':'no-store'};
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');const p=url.pathname;
 if(p==='/api/state'&&req.method==='GET'){
   const k=visitorKey(req);if(k&&game.participants[k]){game.participants[k].lastSeen=Date.now();changed=true;}
   return send(res,200,Engine.publicState(game,k||''));
 }
 if(p==='/api/join'&&req.method==='POST'){
   if(!sameOrigin(req))return send(res,403,{error:'invalid origin'});
   const body=await readJson(req);
   let k=visitorKey(req);if(!k||!game.participants[k]){if(Object.keys(game.participants).length>=150)return send(res,409,{error:'参加人数の上限に達しました。'});k=crypto.randomUUID();}
   if(!Engine.join(game,k,body.name))return send(res,409,{error:'この街は結末を迎えました。次の街で参加できます。'});
   changed=true;save();return send(res,200,{ok:true,state:Engine.publicState(game,k)},{'Set-Cookie':`machi_guest=${k}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`});
 }
 if(p==='/api/ready'&&req.method==='POST'){
   if(!sameOrigin(req))return send(res,403,{error:'invalid origin'});
   const body=await readJson(req),k=visitorKey(req);
   if(!k||!Engine.ready(game,k,body.ready))return send(res,409,{error:'参加待機中に準備状態を変更してください。'});
   changed=true;save();return send(res,200,{ok:true,state:Engine.publicState(game,k)});
 }
 if(p==='/api/start'&&req.method==='POST'){
   if(!sameOrigin(req))return send(res,403,{error:'invalid origin'});
   const k=visitorKey(req);
   if(!k||!game.participants[k]?.ready||!Engine.start(game))return send(res,409,{error:'接続中の参加者全員が「準備OK」にしてから開始してください。'});
   changed=true;save();return send(res,200,{ok:true,state:Engine.publicState(game,k)});
 }
 if(p==='/api/vote'&&req.method==='POST'){
   if(!sameOrigin(req))return send(res,403,{error:'invalid origin'});
   const body=await readJson(req);const k=visitorKey(req),now=Date.now();
   if(!Number.isInteger(body.round)||body.round!==game.round)return send(res,409,{error:'議題が変わりました。もう一度選んでください。'});
   const player=k&&game.participants[k];
   if(!player||game.phase!=='active'||!['human','ai'].includes(body.choice))return send(res,409,{error:'投票を受け付けられませんでした。'});
   // Replaying the same decision is idempotent; rapid switching is not.
   if(game.votes[k]!==body.choice){
    if(player.lastVoteAt&&now-player.lastVoteAt<750)return send(res,409,{error:'少し待ってから選び直してください。'});
    if(!Engine.vote(game,k,body.choice,now))return send(res,409,{error:'投票を受け付けられませんでした。'});
    player.lastVoteAt=now;changed=true;save();
   }
   return send(res,200,{ok:true,state:Engine.publicState(game,k)});
 }
 if(p==='/api/qr.svg'&&req.method==='GET'){
   // QR is generated entirely locally; the destination never reaches an outside API.
   let target=url.searchParams.get('url')||'';
   const targetUrl=new URL(target);
   if(!['http:','https:'].includes(targetUrl.protocol)||targetUrl.host!==req.headers.host||target.length>700||!['/','/index.html'].includes(targetUrl.pathname)||!['','?mode=group'].includes(targetUrl.search)||targetUrl.hash)return send(res,400,{error:'invalid url'});
   const qr=svgForUrl(target);
   res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(qr);
 }
 if(p==='/api/health')return send(res,200,{status:'ok'});
 if(p.startsWith('/api/'))return send(res,404,{error:'not found'});
 const file=(p==='/'?'/index.html':p);const full=path.resolve(pub,'.'+file);
 if(!full.startsWith(pub+path.sep))return send(res,403,{error:'forbidden'});
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
 if(!fs.existsSync(full)||!fs.statSync(full).isFile())return send(res,404,{error:'not found'});
 res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});fs.createReadStream(full).pipe(res);
 }catch(e){console.error(e);if(!res.headersSent)send(res,400,{error:'bad request'});}
});
server.listen(PORT,HOST,()=>console.log(`まちの続き: http://localhost:${PORT}/  (listening ${HOST})`));
