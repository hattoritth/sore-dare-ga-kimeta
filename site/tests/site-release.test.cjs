const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite');
const {pathToFileURL}=require('node:url');

test('Stage4 Sites migration is additive, idempotent and preserves prior city_state',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(fs.readFileSync(path.join(__dirname,'../drizzle/0000_city.sql'),'utf8'));
 const old={phase:'legacy',version:'before-stage4',participants:{legacy:'untouched'}};
 db.prepare('INSERT INTO city_state(id,version,json) VALUES(1,0,?)').run(JSON.stringify(old));
 const migration=fs.readFileSync(path.join(__dirname,'../drizzle/0001_stage4_city.sql'),'utf8');
 db.exec(migration);db.exec(migration);
 assert.deepEqual(JSON.parse(db.prepare('SELECT json FROM city_state WHERE id=1').get().json),old);
 const conn={prepare(sql){let params=[];return {bind(...args){params=args;return this},async first(){return db.prepare(sql).get(...params)||null},async run(){const r=db.prepare(sql).run(...params);return {meta:{changes:Number(r.changes)}}}}}};
 const worker=(await import(pathToFileURL(path.join(__dirname,'../src/worker.mjs')).href)).default;
 const res=await worker.fetch(new Request('https://sites.example/api/state'),{DB:conn,ASSETS:{fetch:()=>new Response('ok')}});
 assert.equal(res.status,200);
 const state=await res.json();assert.equal(state.phase,'waiting');
 assert.deepEqual(JSON.parse(db.prepare('SELECT json FROM city_state WHERE id=1').get().json),old,'legacy record must remain unchanged');
 assert.equal(db.prepare('SELECT COUNT(*) AS c FROM city_state_stage4').get().c,1);
});
test('Sites config explicitly targets existing project and DB binding',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'../.openai/hosting.json')));
 assert.equal(cfg.project_id,'appgprj_6ae596548c00819189f3f54ce3275e02');
 assert.equal(cfg.d1,'DB');assert.equal(cfg.r2,null);
});
