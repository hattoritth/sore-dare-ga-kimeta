const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../public/prototype-engine.js'),D=require('../public/prototype-data.js');
const fixtures=require('./fixtures/prototype-cases.json');
test('prototype mode has no shared API or browser-persistent storage path',()=>{
 const fs=require('node:fs'),path=require('node:path'),ui=fs.readFileSync(path.join(__dirname,'../public/prototype-ui.js'),'utf8'),engine=fs.readFileSync(path.join(__dirname,'../public/prototype-engine.js'),'utf8'),app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
 assert.doesNotMatch(ui,/\bfetch\s*\(|XMLHttpRequest|\/api\//);assert.doesNotMatch(engine,/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|\/api\//);
 assert.ok(app.indexOf("get('prototype')==='1'")<app.indexOf('fetchState();setInterval(fetchState'),'prototype routes before shared polling');
});
const ids=D.scenarios.map(s=>s.id);
function ready(seed=1,focus='S1'){
 const g=E.createGame({seed});E.begin(g);E.advance(g,1.5);
 for(const c of g.cases.filter(c=>c.scenario_id!==focus).slice(0,2)){
  assert.ok(E.openCase(g,c.case_id));assert.ok(E.decide(g,c.case_id,0));E.advance(g,2);
 }
 assert.equal(g.phase,'offer');return g;
}
function play({seed,mode,focus,care}){
 const g=ready(seed,focus);E.answerOffer(g,mode!=='NEVER');
 if(mode==='EARLY_OFF')E.setAI(g,false);
 if(mode==='LATE_OFF'){E.advance(g,4);E.setAI(g,false);}
 while(g.phase==='play'){
  if(g.t>=84&&g.t<106){
   const id=ids.filter(id=>care==='all'||id!==focus).find(id=>g.incidents[id]&&!g.incidents[id].reviewed&&!g.review_jobs.some(j=>j.id===id));
   if(id)E.review(g,id);
  }E.advance(g,1);
 }
 return g;
}
function audit(g){
 for(const n of g.news){
  const e=g.events.find(e=>e.id===n.event_id);assert.ok(e,'news has real event');assert.equal(n.case_id,e.case_id);assert.ok(n.event_time>=e.event_time);
 }
 for(const e of g.decision_log.filter(e=>e.decision_actor==='AI')){
  assert.ok(g.ai_enabled_intervals.some(i=>e.decision_time>=i.start&&(i.end===null||e.decision_time<=i.end)),'AI decision inside authorized interval');
 }
 const x=g.incidents[g.conference_state.scenario_id];assert.ok(g.events.some(e=>e.id===x.event_id));
 const original=g.events.find(e=>e.id===x.event_id);assert.ok(g.events.some(e=>e.type==='warning'&&e.case_id===x.case_id&&e.event_time<original.event_time),'foreshadowing precedes incident');
 assert.equal(E.severity(x),g.conference_state.severity);
 const lines=E.conference(g);assert.equal(lines[0].clip,g.conference_state.scenario_id+'_FIELD');
 if(g.conference_state.ai_state==='ON'){
  assert.ok(lines.some(c=>c.speaker==='AI'&&c.text==='市長に代わって、判断の経緯をご説明します。'));
 }else assert.ok(lines.every(c=>c.speaker!=='AI'),'OFF never speaks');
 for(const c of lines)E.noteSpeech(g,c);
 if(g.conference_state.ai_state!=='ON')assert.ok(!g.events.some(e=>e.type==='proxy_speech'));
 for(const e of g.events.filter(e=>e.type==='proxy_speech'))assert.equal(e.mayor_explicit_approval,false);
}
for(const [key,fixture] of Object.entries(fixtures))test('recorded play reaches '+key,()=>{
 const g=play(fixture);assert.equal([g.conference_state.scenario_id,g.conference_state.severity,g.conference_state.ai_state].join('/'),key);audit(g);
});
test('coverage contains all 60 combinations, without forcing an ending in game state',()=>{
 assert.equal(Object.keys(fixtures).length,60);for(const id of ids)for(const s of ['L','M','H'])for(const a of ['NEVER','EARLY_OFF','LATE_OFF','ON'])assert.ok(fixtures[id+'/'+s+'/'+a]);
});
test('manual demo can wait indefinitely; only explicit decisions unlock the offer',()=>{
 const g=E.createGame({seed:1});E.begin(g);E.advance(g,200);assert.equal(g.phase,'manual');assert.equal(g.decision_log.length,0);
 for(const c of g.cases.slice(0,2)){E.decide(g,c.case_id,1);E.advance(g,2);}assert.equal(g.phase,'offer');
 E.advance(g,200);assert.equal(g.ai_enabled,false);assert.equal(g.t,24);assert.equal(g.phase,'offer');
 E.answerOffer(g,false);E.advance(g,20);assert.ok(g.decision_log.every(e=>e.decision_actor==='mayor'));assert.equal(g.ever_enabled,false);
});
test('parallel AI handles more cases; stop blocks new decisions but retains committed work',()=>{
 const off=ready(),on=ready();E.answerOffer(off,false);E.answerOffer(on,true);E.advance(off,2.2);E.advance(on,2.2);
 assert.equal(on.cases.filter(c=>c.status==='implementing').length,3);
 assert.ok(on.decision_log.length>off.decision_log.length);
 const before=on.decision_log.filter(e=>e.decision_actor==='AI').length;E.setAI(on,false);const at=on.t;
 E.advance(on,25);assert.equal(on.decision_log.filter(e=>e.decision_actor==='AI').length,before);
 assert.ok(on.events.some(e=>e.type==='implementation'&&e.source_actor==='AI'&&e.event_time>at));
 assert.ok(E.setAI(on,true));E.advance(on,5);assert.ok(on.decision_log.filter(e=>e.decision_actor==='AI').length>before);
 assert.equal(on.ai_enabled_intervals.length,2);
});
test('opening a card reserves it; viewing news is distinct from a decision or approval',()=>{
 const g=ready();E.answerOffer(g,true);const c=g.cases.find(c=>c.status==='pending');E.openCase(g,c.case_id);E.advance(g,4);
 assert.equal(c.status,'pending');assert.equal(c.decision_actor,null);E.releaseCase(g,c.case_id);E.advance(g,5);assert.equal(c.status,'resolved');
 const n=g.news[0],count=g.decision_log.length;E.markNews(g,n.id,'shown');assert.equal(n.news_opened.length,0);
 E.markNews(g,n.id,'opened');assert.equal(n.news_opened.length,1);assert.equal(g.decision_log.length,count);
});
test('stop classification follows only the incident main judgment across multiple intervals',()=>{
 const g=ready(1,'S1');E.answerOffer(g,true);E.setAI(g,false);assert.equal(E.aiState(g,'S1'),'EARLY_OFF');
 E.advance(g,5);E.setAI(g,true);E.advance(g,4);E.setAI(g,false);assert.equal(E.aiState(g,'S1'),'LATE_OFF');
 // S2 was a mayor decision; unrelated later AI consultations do not change its actor.
 assert.equal(E.aiState(g,'S2'),'EARLY_OFF');E.setAI(g,true);assert.equal(E.aiState(g,'S1'),'ON');
});
test('happiness is the rounded actual aggregate, with impacts able to reduce it while AI is on',()=>{
 const g=ready(20,'S4');E.answerOffer(g,true);E.advance(g,83);const before=g.happiness;E.advance(g,2);
 assert.equal(g.happiness,Math.round(Object.values(g.public).reduce((a,b)=>a+b,0)/3));assert.ok(g.happiness<before);assert.equal(g.ai_enabled,true);
});
test('v7 cards and letters stay limited to the five supplied themes',()=>{
 assert.deepEqual(D.scenarios.map(s=>s.theme),[4,13,21,35,47]);assert.equal(Object.keys(D.letters).length,5);
 for(const s of D.scenarios){assert.equal(s.options.length,4);assert.ok(D.letters[s.id].paragraphs.length>=5);}
 assert.deepEqual(Object.keys(D.MEDIA).sort(),['CONF_OPEN','CONF_MAYOR','CONF_SILENCE','CONF_AI_ON','CONF_AI_OFF','CONF_END','S1_FIELD','S2_FIELD','S3_FIELD','S4_FIELD','S5_FIELD'].sort());
});
test('a later mayor choice in another household is never attributed to the incident case',()=>{
 const g=ready(1,'S1');E.answerOffer(g,true);E.advance(g,10);E.setAI(g,false);E.advance(g,15);
 const c=g.cases.find(c=>c.scenario_id==='S1'&&!c.primary&&c.status==='pending');assert.ok(c);E.openCase(g,c.case_id);E.decide(g,c.case_id,1);E.advance(g,2);
 E.advance(g,80);g.conference_state.scenario_id='S1';g.conference_state.ai_state=E.aiState(g,'S1');
 const lines=E.conference(g).filter(c=>c.speaker==='市長').map(c=>c.text).join('');assert.match(lines,/この案件について、市長が対応策を選んだ記録はありません/);assert.doesNotMatch(lines,/別の案件|S2|買い物/);
});
test('decisions after an incident remain later decisions, not its retroactive cause',()=>{
 const g=ready(1,'S1');E.answerOffer(g,false);E.advance(g,85);assert.ok(g.incidents.S1.event_id);
 E.setAI(g,true);E.advance(g,4);E.setAI(g,false);assert.equal(E.aiState(g,'S1'),'EARLY_OFF');
 E.setAI(g,true);E.advance(g,20);g.conference_state.scenario_id='S1';g.conference_state.ai_state='ON';
 assert.ok(E.conference(g).some(c=>c.speaker==='AI'&&c.text.includes('事案が記録された時点では')));
});
test('policy changes can reduce an actual impact under the same conditions and stop history',()=>{
 const games=[0,1].map(option=>{const g=ready(2,'S2');E.answerOffer(g,false);E.decide(g,'S2-01',option);E.advance(g,100);return g;});
 assert.equal(games[0].incidents.S2.severity,'H');assert.equal(games[1].incidents.S2.severity,'M');
 assert.ok(games[0].incidents.S2.impact_duration>games[1].incidents.S2.impact_duration);
 assert.ok(games.every(g=>g.ai_enabled_intervals.length===0));
});

test('final letter invites visitors to take a physical envelope only after the conference',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const ui=fs.readFileSync(path.join(__dirname,'../public/prototype-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../public/prototype.css'),'utf8');
 assert.match(ui,/function letter\(\)[\s\S]*会場にある封筒を1通お取りください。/);
 assert.match(ui,/あなたの街から届いた手紙が入っています。/);
 assert.match(css,/\.pt-letter-takeaway\{/);
 assert.ok(ui.indexOf('pt-letter-takeaway')>ui.indexOf('function letter()'));
});

test('all five physical letter envelopes use the team-approved colours and distinct SVG fills',()=>{
 const expected={
  S1:['青','安全・安心','#428BC4'],
  S2:['濃い緑','生活の豊かさ','#297A59'],
  S3:['紫','公平性','#9169B5'],
  S4:['薄い緑','自由・自己決定','#B7DDA4'],
  S5:['黄色','つながり・生きがい','#EBC454']
 };
 assert.deepEqual(Object.keys(D.envelopes).sort(),Object.keys(expected).sort());
 for(const [id,[color,theme,base]] of Object.entries(expected)){
  const envelope=D.envelopes[id];assert.equal(envelope.color,color,id+' color');assert.equal(envelope.theme,theme,id+' theme');assert.equal(envelope.base,base,id+' SVG colour');
  assert.ok(/^#[0-9A-Fa-f]{6}$/.test(envelope.light)&&/^#[0-9A-Fa-f]{6}$/.test(envelope.dark));
 }
 assert.equal(new Set(Object.values(D.envelopes).map(x=>x.base)).size,5);
 const fs=require('node:fs'),path=require('node:path');
 const ui=fs.readFileSync(path.join(__dirname,'../public/prototype-ui.js'),'utf8');
 assert.match(ui,/function envelopeIllustration\(id,style\)/);
 assert.match(ui,/document\.createElementNS\(ns,tag\)/);
 assert.match(ui,/const envelope=D\.envelopes\[id\]/);
 assert.match(ui,/visual\.append\(envelopeIllustration\(id,envelope\)/);
 assert.match(ui,/insertBefore\(takeaway,details\)/,'colour appears before the digital letter');
});
