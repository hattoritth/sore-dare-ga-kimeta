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
test('GitHub repository root hosting manifest matches the existing Site manifest',()=>{
 const root=JSON.parse(fs.readFileSync(path.join(__dirname,'../../.openai/hosting.json'),'utf8'));
 const site=JSON.parse(fs.readFileSync(path.join(__dirname,'../.openai/hosting.json'),'utf8'));
 assert.deepEqual(root,site,'root manifest and site build manifest must be identical');
 assert.deepEqual(root,{
  project_id:'appgprj_6ae596548c00819189f3f54ce3275e02',
  d1:'DB',
  r2:null
 });
});

test('Sites config explicitly targets existing project and DB binding',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'../.openai/hosting.json')));
 assert.equal(cfg.project_id,'appgprj_6ae596548c00819189f3f54ce3275e02');
 assert.equal(cfg.d1,'DB');assert.equal(cfg.r2,null);
});


test('Drizzle journal registers all migration SQL in stable chronological order',()=>{
 const migrationsDir=path.join(__dirname,'../drizzle');
 const journal=JSON.parse(fs.readFileSync(path.join(migrationsDir,'meta/_journal.json'),'utf8'));
 assert.equal(journal.version,'7');
 assert.equal(journal.dialect,'sqlite');
 assert.deepEqual(journal.entries.map(x=>x.tag),['0000_city','0001_stage4_city']);
 assert.deepEqual(journal.entries.map(x=>x.idx),[0,1]);
 assert.deepEqual(journal.entries.map(x=>x.version),['6','6']);
 assert.ok(journal.entries.every(x=>x.breakpoints===true));
 for(let i=0;i<journal.entries.length;i++){
  const entry=journal.entries[i];
  assert.ok(Number.isSafeInteger(entry.when));
  assert.ok(i===0||journal.entries[i-1].when<entry.when,'timestamps must increase');
  assert.ok(fs.statSync(path.join(migrationsDir,entry.tag+'.sql')).size>0,'registered migration SQL exists');
 }
 const staged=fs.readFileSync(path.join(migrationsDir,'0001_stage4_city.sql'),'utf8').trim();
 assert.ok(staged.startsWith('CREATE TABLE IF NOT EXISTS'));
 assert.ok(staged.includes('city_state_stage4'));
 assert.doesNotMatch(staged,/\b(DROP|ALTER|DELETE|UPDATE|TRUNCATE)\b/i);
});

test('registered Stage 4 migration changes only an additive table, preserving original rows and schema',()=>{
 const base=fs.readFileSync(path.join(__dirname,'../drizzle/0000_city.sql'),'utf8');
 const add=fs.readFileSync(path.join(__dirname,'../drizzle/0001_stage4_city.sql'),'utf8');
 const db=new DatabaseSync(':memory:');
 db.exec(base);
 const originalRow={phase:'active',participants:{p:'private'},custom:'do not touch'};
 db.prepare('INSERT INTO city_state (id,version,json) VALUES (1,7,?)').run(JSON.stringify(originalRow));
 const beforeSchema=db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get('city_state').sql;
 const beforeRow=db.prepare('SELECT * FROM city_state WHERE id=1').get();
 db.exec(add);
 db.exec(add);
 assert.equal(db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get('city_state').sql,beforeSchema);
 assert.deepEqual(db.prepare('SELECT * FROM city_state WHERE id=1').get(),beforeRow);
 assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='city_state_stage4'").get().n,1);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM city_state_stage4').get().n,0,'no irreversible creation of fresh game state in migration');
});


test('Stage 4 Worker initializes its missing D1 table without changing legacy state',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(fs.readFileSync(path.join(__dirname,'../drizzle/0000_city.sql'),'utf8'));
 const old={phase:'active',participants:{legacy:'preserved'},note:'existing live site'};
 db.prepare('INSERT INTO city_state(id,version,json) VALUES(1,17,?)').run(JSON.stringify(old));
 const before=db.prepare('SELECT * FROM city_state WHERE id=1').get();
 const conn={prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return db.prepare(sql).get(...args)||null},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}}}};
 const worker=(await import(pathToFileURL(path.join(__dirname,'../src/worker.mjs')).href)).default;
 const env={DB:conn,ASSETS:{fetch:()=>new Response('ok')}};
 for(let i=0;i<2;i++){
  const res=await worker.fetch(new Request('https://sites.example/api/state'),env);
  assert.equal(res.status,200,'game state API must work on database with old table only');
  const state=await res.json();
  assert.ok(['waiting','lobby'].includes(state.phase));
 }
 assert.deepEqual(db.prepare('SELECT * FROM city_state WHERE id=1').get(),before,'legacy state unchanged');
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM city_state_stage4').get().n,1,'new game initialized once');
});
