const test=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

test('five independent D1 participants complete all seven group decisions and earn accountable TRUE',async()=>{
 const worker=(await import(pathToFileURL(path.resolve(__dirname,'../src/worker.mjs')).href)).default;
 const sqlite=new DatabaseSync(':memory:');
 try{
  sqlite.exec('CREATE TABLE city_state (id INTEGER PRIMARY KEY,version INTEGER NOT NULL,json TEXT NOT NULL)');
  sqlite.prepare('INSERT INTO city_state(id,version,json) VALUES(1,?,?)').run(3,JSON.stringify({legacy:'preserve existing city'}));
  const original=sqlite.prepare('SELECT * FROM city_state WHERE id=1').get();
  const DB={prepare(sql){let args=[];return{
   bind(...xs){args=xs;return this},
   async first(){return sqlite.prepare(sql).get(...args)||null},
   async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}
  }}};
  const env={DB,ASSETS:{fetch:()=>new Response('local-only asset')}};
  const host='https://stage4-uat.test';
  const call=(route,method='GET',data=null,cookie='')=>worker.fetch(new Request(host+route,{
   method,headers:{...(cookie?{Cookie:cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},
   body:data?JSON.stringify(data):undefined
  }),env);
  const cookies=[];
  for(let i=0;i<5;i++){
   const r=await call('/api/join','POST',{name:'test participant '+(i+1)});
   assert.equal(r.status,200);
   cookies.push(r.headers.get('set-cookie').split(';')[0]);
  }
  assert.equal(new Set(cookies).size,5,'each participant has an independent session');
  for(const cookie of cookies)assert.equal((await call('/api/ready','POST',{ready:true},cookie)).status,200);
  assert.equal((await call('/api/start','POST',null,cookies[0])).status,200);
  const expected=['human','human','human','ai','ai','human','human'];
  for(let round=0;round<expected.length;round++){
   const responses=await Promise.all(cookies.map((cookie,i)=>
    call('/api/vote','POST',{round,choice:round===3&&i<2?'human':expected[round]},cookie)));
   assert.ok(responses.every(r=>r.status===200),'all five concurrent votes accepted in round '+(round+1));
   const before=(await (await call('/api/state')).json());
   assert.equal(before.round,round);
   assert.equal(before.voteCount,5);
   assert.equal(before.ending,undefined,'TRUE status hidden during voting');
   assert.equal(before.shadow,undefined,'all three hidden metrics remain secret during voting');
   if(round===3){
    const minority=await (await call('/api/state','GET',null,cookies[0])).json();
    const majority=await (await call('/api/state','GET',null,cookies[4])).json();
    assert.equal(minority.myVote,'human');
    assert.equal(majority.myVote,'ai');
   }
   // Expire the 23-second timer only in this test's isolated D1 database.
   // Then let the *unmodified Worker* use its real Engine.advance path.
   const row=sqlite.prepare('SELECT version,json FROM city_state_stage4 WHERE id=1').get();
   const game=JSON.parse(row.json);game.roundEndsAt=Date.now()-1;
   // The 23s elapse also clears the 750ms vote-switch guard between rounds.
   for(const p of Object.values(game.participants))if(p.lastVoteAt)p.lastVoteAt-=23000;
   assert.equal(sqlite.prepare('UPDATE city_state_stage4 SET json=?,version=version+1 WHERE id=1 AND version=?')
    .run(JSON.stringify(game),row.version).changes,1);
   const after=await (await call('/api/state')).json();
   assert.equal(after.history.length,round+1);
   assert.equal(after.history[round].chosen,expected[round]);
   assert.equal(after.round,round+1);
   assert.equal(after.phase,round===6?'reveal':'active');
  }
  const end=await (await call('/api/state')).json();
  assert.equal(end.participantCount,5);
  assert.equal(end.roundTotal,7);
  assert.equal(end.ending.kind,'true');
  assert.equal(end.outcome,'survived');
  assert.ok(Object.values({...end.public,...end.shadow}).every(x=>x>=40));
  assert.equal((await call('/api/vote','POST',{round:0,choice:'ai'},cookies[0])).status,409,'stale round rejected');
  assert.equal((await call('/api/vote','POST',{round:7,choice:'ai'})).status,409,'anonymous vote rejected');
  assert.deepEqual(sqlite.prepare('SELECT * FROM city_state WHERE id=1').get(),original,'legacy D1 data unchanged');
 }finally{sqlite.close();}
});
