const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync,writeFileSync}=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const Engine=require('../engine.js');
test('shared HTTP API, cookie participation, vote aggregation, local QR and privacy',async()=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),'machi-test-'));
 const port=40000+Math.floor(Math.random()*16000);
 const server=spawn(process.execPath,['server.mjs'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DATA_PATH:path.join(temp,'city.json')}});
 const host=`http://127.0.0.1:${port}`;
 try{
  let ready=false;
  for(let i=0;i<50;i++){try{const r=await fetch(host+'/api/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,60));}
  assert.ok(ready,'server ready');
  const get=async(cookie='')=>(await fetch(host+'/api/state',{headers:cookie?{Cookie:cookie}:{}})).json();
  const post=async(path,body,cookie='')=>fetch(host+path,{method:'POST',headers:{'content-type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  const waiting=await get();assert.equal(waiting.phase,'waiting');assert.ok(!('shadow' in waiting));
  const first=await post('/api/join',{name:'A'});const aCookie=first.headers.get('set-cookie').split(';')[0];assert.equal(first.status,200);
  const second=await post('/api/join',{name:'B'});const bCookie=second.headers.get('set-cookie').split(';')[0];assert.equal(second.status,200);
  assert.equal((await get(aCookie)).phase,'lobby','participants can join without starting the voting timer');
  assert.equal((await post('/api/start',{},'machi_guest=invalid')).status,409,'only a participant can start the shared session');
  assert.equal((await post('/api/start',{},aCookie)).status,409,'unready lobby cannot start');
  assert.equal((await post('/api/ready',{ready:true},aCookie)).status,200);
  assert.equal((await post('/api/start',{},aCookie)).status,409,'another unready participant blocks starting');
  assert.equal((await post('/api/ready',{ready:true},bCookie)).status,200);
  const started=await post('/api/start',{},aCookie);assert.equal(started.status,200);assert.equal((await started.json()).state.phase,'active');
  assert.equal((await get(aCookie)).isParticipant,true);
  assert.equal((await get()).isParticipant,false);
  assert.equal((await post('/api/vote',{choice:'ai',round:0},aCookie)).status,200);
  assert.equal((await post('/api/vote',{choice:'ai',round:0},aCookie)).status,200,'same vote is idempotent after a reload');
  assert.equal((await post('/api/vote',{choice:'human',round:0},aCookie)).status,409,'rapid vote switching is rejected');
  await new Promise(r=>setTimeout(r,760));
  assert.equal((await post('/api/vote',{choice:'human',round:0},aCookie)).status,200,'a deliberate choice change is accepted');
  assert.equal((await get(aCookie)).myVote,'human','refresh with the same cookie restores the current vote');
  assert.equal((await post('/api/vote',{choice:'human',round:0},bCookie)).status,200);
  const city=await get();assert.equal(city.participantCount,2);assert.equal(city.voteCount,2);assert.equal(city.round,0);
  assert.equal(city.shadow,undefined);
  assert.equal((await post('/api/vote',{choice:'ai',round:0},'machi_guest=invalid')).status,409);
  assert.equal((await post('/api/vote',{choice:'human',round:1},aCookie)).status,409,'reject stale round');
  assert.equal((await post('/api/vote',{choice:'human',round:0},aCookie)).status,200,'same vote is idempotent');
  const crossOrigin=await fetch(host+'/api/vote',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.org','Cookie':aCookie},body:JSON.stringify({choice:'ai',round:0})});
  assert.equal(crossOrigin.status,403);
  const q=await fetch(host+'/api/qr.svg?url='+encodeURIComponent(host+'/'));assert.equal(q.status,200);assert.match(await q.text(),/<svg/);
  const bad=await fetch(host+'/api/qr.svg?url='+encodeURIComponent('https://evil.example/'));assert.equal(bad.status,400);
  const extraPath=await fetch(host+'/api/qr.svg?url='+encodeURIComponent(host+'/not-the-landing/'));assert.equal(extraPath.status,400);
  const late=await post('/api/join',{name:'Later'});const lateCookie=late.headers.get('set-cookie').split(';')[0];
  assert.equal((await late.json()).state.joiningNextRound,true);
  assert.equal((await post('/api/vote',{choice:'ai',round:0},lateCookie)).status,409,'late entrant waits for a full next round');
  assert.equal((await get(lateCookie)).joiningNextRound,true,'reload preserves late-join waiting');
  assert.equal((await fetch(host+'/api/qr.svg?url='+encodeURIComponent(host+'/?mode=group'))).status,200);
 }finally{if(server.exitCode===null){server.kill();await new Promise(resolve=>server.once('exit',resolve));}rmSync(temp,{recursive:true,force:true});}
});

test('Node server records zero votes as a deferred decision with no city change',async()=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),'machi-no-votes-'));
 const data=path.join(temp,'city.json'),port=40000+Math.floor(Math.random()*16000);
 const game=Engine.createGame(Date.now(),{autostart:true});Engine.join(game,'participant','参加者');game.roundEndsAt=Date.now()-1;
 writeFileSync(data,JSON.stringify(game));
 const server=spawn(process.execPath,['server.mjs'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DATA_PATH:data}});
 const host=`http://127.0.0.1:${port}`;
 try{
  let state,ready=false;
  for(let i=0;i<70;i++){
   try{const response=await fetch(host+'/api/state');if(response.ok){ready=true;state=await response.json();if(state.round>0)break;}}catch{}
   await new Promise(r=>setTimeout(r,60));
  }
  assert.ok(ready,'Node server became ready');
  if(state.round===0){await new Promise(r=>setTimeout(r,450));state=await(await fetch(host+'/api/state')).json();}
  assert.equal(state.phase,'active');assert.equal(state.round,1);assert.equal(state.voteCount,0);
  assert.equal(state.history[0].chosen,'none');assert.equal(state.history[0].noVotes,true);
  assert.deepEqual(state.public,Engine.INITIAL_PUBLIC);assert.deepEqual(state.built,{});
  assert.ok(!('shadow' in state));assert.equal(state.lastEvent.crisisAverted,undefined);
 }finally{if(server.exitCode===null){server.kill();await new Promise(resolve=>server.once('exit',resolve));}rmSync(temp,{recursive:true,force:true});}
});
