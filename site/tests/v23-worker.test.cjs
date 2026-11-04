const test=require('node:test');const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');const path=require('node:path');const {pathToFileURL}=require('node:url');
class DB{constructor(){this.db=new DatabaseSync(':memory:');this.db.exec('CREATE TABLE city_state_stage4 (id INTEGER PRIMARY KEY, version INTEGER NOT NULL, json TEXT NOT NULL)');}prepare(sql){const db=this.db;let args=[];return{bind(...a){args=a;return this},async first(){return db.prepare(sql).get(...args)||null},async run(){const r=db.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}}}}}
test('Worker v23 hides all six metrics, validates actions, honors idempotency and rate limits, and reveals plurality counts',async()=>{
 const worker=(await import(pathToFileURL(path.resolve(__dirname,'../src/worker.mjs')).href)).default,env={DB:new DB()},origin='https://local.invalid';
 const call=(url,method='GET',data,cookie)=>worker.fetch(new Request(origin+url,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),Origin:origin},body:data?JSON.stringify(data):undefined}),env);
 const start=await(await call('/api/state')).json();assert.deepEqual(start.public,{happiness:71});assert.equal(start.shadow,undefined);
 const joined=[];for(let i=0;i<3;i++){const r=await call('/api/join','POST',{name:`P${i}`});joined.push(r.headers.get('set-cookie').split(';')[0]);}
 for(const c of joined)await call('/api/ready','POST',{ready:true},c);await call('/api/start','POST',undefined,joined[0]);
 const active=await(await call('/api/state')).json();assert.deepEqual(active.public,{happiness:71});assert.equal(active.shadow,undefined);assert.ok(!JSON.stringify(active).includes('trust'));
 const opts=active.episode.options;assert.equal(opts.length,4);assert.equal((await call('/api/vote','POST',{choice:'arbitrary',round:0},joined[0])).status,409);
 assert.equal((await call('/api/vote','POST',{choice:opts[0].id,round:0},joined[0])).status,200);
 assert.equal((await call('/api/vote','POST',{choice:opts[0].id,round:0},joined[0])).status,200,'same option replay is idempotent');
 assert.equal((await call('/api/vote','POST',{choice:opts[1].id,round:0},joined[0])).status,409,'fast option changes respect cooldown');
 await new Promise(r=>setTimeout(r,760));assert.equal((await call('/api/vote','POST',{choice:opts[1].id,round:0},joined[0])).status,200);
 assert.equal((await call('/api/vote','POST',{choice:'e1-listen',round:0},joined[1])).status,409,'stale episode option rejected');
 // Persist a final-round cohort directly to exercise reveal serialization without waiting seven timers.
 const row=env.DB.db.prepare('SELECT json FROM city_state_stage4 WHERE id=1').get(),g=JSON.parse(row.json);g.round=6;g.phase='active';g.roundEndsAt=Date.now()+10000;g.votes={};g.optionVotes={};
 const finalOptions=require('../engine.js').publicState({...g,phase:'active'},'',Date.now()).episode.options;
 for(let i=0;i<3;i++){const c=joined[i].slice(joined[i].indexOf('=')+1);const id=finalOptions[i===2?2:1].id;g.votes[c]=i===2?'ai':'human';g.optionVotes[c]=id;}
 g.roundEndsAt=Date.now()-1;env.DB.db.prepare('UPDATE city_state_stage4 SET json=?,version=version+1 WHERE id=1').run(JSON.stringify(g));
 const reveal=await(await call('/api/state')).json();assert.equal(reveal.phase,'reveal');assert.equal(reveal.shadow===undefined,false);assert.equal(reveal.history[0].optionCounts[finalOptions[1].id],2);assert.equal(reveal.history[0].winningOption,finalOptions[1].id);assert.equal(reveal.history[0].participantVotes.length,3);
});
