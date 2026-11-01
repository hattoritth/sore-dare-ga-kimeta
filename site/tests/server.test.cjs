const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const os=require('node:os');
const path=require('node:path');
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
  assert.equal((await get(aCookie)).isParticipant,true);
  assert.equal((await get()).isParticipant,false);
  assert.equal((await post('/api/vote',{choice:'ai'},aCookie)).status,200);
  assert.equal((await post('/api/vote',{choice:'human'},bCookie)).status,200);
  const city=await get();assert.equal(city.participantCount,2);assert.equal(city.voteCount,2);assert.equal(city.round,0);
  assert.equal(city.shadow,undefined);
  assert.equal((await post('/api/vote',{choice:'ai'},'machi_guest=invalid')).status,409);
  const q=await fetch(host+'/api/qr.svg?url='+encodeURIComponent(host+'/'));assert.equal(q.status,200);assert.match(await q.text(),/<svg/);
  const bad=await fetch(host+'/api/qr.svg?url='+encodeURIComponent('https://evil.example/'));assert.equal(bad.status,400);
 }finally{server.kill();rmSync(temp,{recursive:true,force:true});}
});
