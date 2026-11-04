const test=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const host='https://machi.example';
class MockD1{
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec('CREATE TABLE city_state (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, json TEXT NOT NULL); CREATE TABLE city_state_stage4 (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, json TEXT NOT NULL)');}
 prepare(sql){const db=this.db;let args=[];return {
  bind(...next){args=next;return this;},
  async first(){return db.prepare(sql).get(...args)||null;},
  async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}
 };}
}
test('Worker D1: five participants, secret state, QR and cookie reconnect',async()=>{
 const worker=(await import(pathToFileURL(path.resolve(__dirname,'../src/worker.mjs')).href)).default;
 const env={DB:new MockD1(),ASSETS:{fetch:async(req)=>new Response('static asset',{status:200})}};
 const request=(pathname,method='GET',data=null,cookie='')=>worker.fetch(new Request(host+pathname,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined}),env);
 const start=await (await request('/api/state')).json();assert.equal(start.phase,'waiting');assert.equal(start.shadow,undefined);
 const cookies=[];
 for(let i=0;i<5;i++){
  const res=await request('/api/join','POST',{name:'プレイヤー'+(i+1)});
  assert.equal(res.status,200);
  cookies.push(res.headers.get('set-cookie').split(';')[0]);
 }
 const lobby=await (await request('/api/state')).json();assert.equal(lobby.phase,'lobby');
 assert.equal((await request('/api/start','POST')).status,409,'anonymous visitors cannot start the session');
 assert.equal((await request('/api/start','POST',null,cookies[0])).status,409);
 for(const cookie of cookies)assert.equal((await request('/api/ready','POST',{ready:true},cookie)).status,200);
 assert.equal((await request('/api/start','POST',null,cookies[0])).status,200);
 const active=await (await request('/api/state')).json();assert.equal(active.phase,'active');assert.equal(active.episode.impact,undefined,'private rule deltas are not included in the API episode');
 for(let i=0;i<5;i++){
  const res=await request('/api/vote','POST',{choice:i<2?'human':'ai',round:0},cookies[i]);
  assert.equal(res.status,200);
 }
 let anonymous=await (await request('/api/state')).json();
 assert.equal(anonymous.participantCount,5);assert.equal(anonymous.voteCount,5);
 assert.equal(anonymous.shadow,undefined);
 const game=JSON.parse(env.DB.db.prepare('SELECT json FROM city_state_stage4 WHERE id=1').get().json);
 game.shadow.trust=29;
 env.DB.db.prepare('UPDATE city_state_stage4 SET json=? WHERE id=1').run(JSON.stringify(game));
 const warn=await (await request('/api/state')).json();
 assert.ok(warn.alert,'warning is exposed as narrative');
 assert.equal(warn.shadow,undefined);
 assert.ok(!JSON.stringify(warn).includes('"trust"'));
 const own=await (await request('/api/state','GET',null,cookies[0])).json();
 assert.equal(own.isParticipant,true);assert.equal(own.myVote,'human');
 const outsider=await request('/api/vote','POST',{choice:'human',round:0});assert.equal(outsider.status,409);
 const qr=await request('/api/qr.svg?url='+encodeURIComponent(host+'/'));
 assert.equal(qr.status,200);assert.match(await qr.text(),/<svg[\s\S]+<path/);
 assert.equal((await request('/api/qr.svg?url='+encodeURIComponent('https://evil.example/'))).status,400);
 assert.equal((await request('/')).status,200);
 const late=await request('/api/join','POST',{name:'Later'}),lateCookie=late.headers.get('set-cookie').split(';')[0];
 assert.equal((await late.json()).state.joiningNextRound,true);
 assert.equal((await request('/api/vote','POST',{choice:'human',round:0},lateCookie)).status,409);
 assert.equal((await request('/api/qr.svg?url='+encodeURIComponent(host+'/?mode=group'))).status,200);
});
