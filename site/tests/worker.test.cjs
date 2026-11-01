const test=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const path=require('node:path');
const host='https://machi.example';
class MockD1{
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec('CREATE TABLE city_state (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, json TEXT NOT NULL)');}
 prepare(sql){const db=this.db;let args=[];return {
  bind(...next){args=next;return this;},
  async first(){return db.prepare(sql).get(...args)||null;},
  async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}
 };}
}
test('Worker D1: five participants, secret state, QR and cookie reconnect',async()=>{
 const worker=(await import(path.resolve(__dirname,'../src/worker.mjs'))).default;
 const env={DB:new MockD1(),ASSETS:{fetch:async(req)=>new Response('static asset',{status:200})}};
 const request=(pathname,method='GET',data=null,cookie='')=>worker.fetch(new Request(host+pathname,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined}),env);
 const start=await (await request('/api/state')).json();assert.equal(start.phase,'waiting');assert.equal(start.shadow,undefined);
 const cookies=[];
 for(let i=0;i<5;i++){
  const res=await request('/api/join','POST',{name:'プレイヤー'+(i+1)});
  assert.equal(res.status,200);
  cookies.push(res.headers.get('set-cookie').split(';')[0]);
 }
 for(let i=0;i<5;i++){
  const res=await request('/api/vote','POST',{choice:i<2?'human':'ai',round:0},cookies[i]);
  assert.equal(res.status,200);
 }
 let anonymous=await (await request('/api/state')).json();
 assert.equal(anonymous.participantCount,5);assert.equal(anonymous.voteCount,5);
 assert.equal(anonymous.shadow,undefined);
 const own=await (await request('/api/state','GET',null,cookies[0])).json();
 assert.equal(own.isParticipant,true);assert.equal(own.myVote,'human');
 const outsider=await request('/api/vote','POST',{choice:'human',round:0});assert.equal(outsider.status,409);
 const qr=await request('/api/qr.svg?url='+encodeURIComponent(host+'/'));
 assert.equal(qr.status,200);assert.match(await qr.text(),/<svg[\s\S]+<path/);
 assert.equal((await request('/api/qr.svg?url='+encodeURIComponent('https://evil.example/'))).status,400);
 assert.equal((await request('/')).status,200);
});
