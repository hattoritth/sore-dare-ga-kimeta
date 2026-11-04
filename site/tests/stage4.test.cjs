const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const E=require('../engine.js');
const metrics=['prosperity','convenience','appeal','trust','fairness','resilience'];

test('all six ending metrics distinguish <10, 10..29 and >=30 without claiming safety',()=>{
 for(const metric of metrics)for(const value of [9,10,29,30]){
  const g=E.createGame(0);g.phase='reveal';g.outcome=value<10?'collapse':'survived';g.history=[{chosen:'human',noVotes:false,deferred:false}];
  (Object.hasOwn(g.public,metric)?g.public:g.shadow)[metric]=value;
  const state=E.publicState(g,'',0),expected=value<10?'collapse':value<30?'warning':'stable';
  assert.equal(state.ending.kind,expected,`${metric}=${value}`);
  assert.equal(state.ending.risks.some(x=>x.metric===metric),value<30);
  if(value<10)assert.equal(state.incident.metric,metric);
  if(value<30)assert.match(state.ending.risks.find(x=>x.metric===metric).detail,/.+/);
 }
});
test('all seven tied proposals preserve existing facilities and all metrics, with a deferred ending',()=>{
 const g=E.createGame(0,{autostart:true});E.join(g,'a','A',0);E.join(g,'b','B',0);
 const original={public:{...g.public},shadow:{...g.shadow},built:{}};
 for(let i=0;i<7;i++){
  E.vote(g,'a','human',g.roundStartedAt+1);E.vote(g,'b','ai',g.roundStartedAt+1);E.advance(g,g.roundEndsAt);
  assert.deepEqual(g.built,original.built,`episode ${i+1}`);assert.deepEqual(g.public,original.public);assert.deepEqual(g.shadow,original.shadow);
  assert.equal(g.lastEvent.chosen,'mixed');assert.equal(g.lastEvent.noVotes,false);assert.equal(g.lastEvent.deferred,true);assert.match(g.lastEvent.result,/最多票が同数のため、計画を保留/);
 }
 assert.equal(g.outcome,'undecided');assert.match(E.publicState(g).ending.heading,/決めきれなかった/);
});
test('all-zero voting has a dedicated ending and returns to a new city on schedule',()=>{
 const g=E.createGame(0,{autostart:true});for(let i=0;i<7;i++)E.advance(g,g.roundEndsAt);
 const s=E.publicState(g);assert.equal(s.outcome,'undecided');assert.equal(s.ending.kind,'undecided');assert.match(s.ending.heading,/誰も決めなかった/);
 assert.ok(g.history.every(x=>x.chosen==='none'));assert.equal(E.advance(g,g.revealEndsAt),'restart');
});
test('shared start requires every connected participant ready, handles withdrawal and reconnect',()=>{
 const g=E.createGame(0);E.join(g,'a','A',0);E.join(g,'b','B',0);
 assert.equal(E.ready(g,'outsider',true,0),false);E.ready(g,'a',true,1);assert.equal(E.start(g,2),false);
 E.ready(g,'b',true,2);E.ready(g,'b',false,3);assert.equal(E.start(g,4),false);
 E.ready(g,'a',true,90001);assert.equal(E.publicState(g,'a',90004).canStart,true,'offline unready player is excluded');
 E.join(g,'b','B',90004);assert.equal(E.start(g,90005),false,'reconnecting unready player blocks premature start');
 E.ready(g,'b',true,90005);assert.equal(E.start(g,90006),true);
 assert.equal(g.roundEndsAt-g.roundStartedAt,E.ROUND_MS);
});
test('late joiners wait for a full next round, and reconnect preserves their eligibility',()=>{
 const g=E.createGame(0,{autostart:true});E.join(g,'a','A',0);E.join(g,'late','L',22000);
 assert.equal(E.vote(g,'late','ai',22001),false);assert.equal(E.publicState(g,'late',22001).joiningNextRound,true);
 E.join(g,'late','L',22002);E.advance(g,g.roundEndsAt);
 assert.equal(E.publicState(g,'late',g.roundStartedAt).canVote,true);
 assert.equal(E.vote(g,'late','human',g.roundStartedAt+1),true);assert.equal(g.roundEndsAt-g.roundStartedAt,E.ROUND_MS);
});
test('solo all-AI and all-human both end in distinct, explainable collapses',()=>{
 for(const choice of ['ai','human']){
  const g=E.createGame(0,{autostart:true,storyMode:'solo'});E.join(g,'s','S',1);
  for(let i=0;i<4;i++){assert.equal(E.vote(g,'s',choice,g.roundStartedAt+1),true);E.advance(g,g.roundEndsAt);}
  const s=E.publicState(g);assert.equal(s.ending.kind,'collapse');
  assert.equal(s.ending.metric,choice==='ai'?'resilience':'prosperity');
  if(choice==='ai'){assert.ok(s.shadow.resilience<10);assert.match(s.ending.description,/備え|豪雨/);}
 }
});
test('warning recovery is recorded separately from averting the ending threshold',()=>{
 const g=E.createGame(0,{autostart:true,storyMode:'solo'});E.join(g,'a','A',0);g.shadow.trust=25;
 E.vote(g,'a','human',1);E.advance(g,g.roundEndsAt);
 assert.equal(g.lastEvent.interventionAttempted,true);assert.deepEqual(g.lastEvent.warningRecovered,['trust']);assert.deepEqual(g.lastEvent.crisisAverted,[]);
 assert.equal(E.publicState(g).lastEvent.warningRecovered,undefined,'hidden metric names remain private during play');
});
test('handoff analysis runs from an arbitrary extracted folder and unrelated working directory',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'f5-stage4-portable-'));
 try{
  const root=path.join(temp,'renamed-extraction'),site=path.join(root,'candidate','site'),evidence=path.join(root,'evidence');
  fs.mkdirSync(path.join(site,'scripts'),{recursive:true});fs.mkdirSync(evidence,{recursive:true});
  fs.copyFileSync(path.join(__dirname,'../engine.js'),path.join(site,'engine.js'));
  fs.copyFileSync(path.join(__dirname,'../scripts/path-analysis.cjs'),path.join(site,'scripts','path-analysis.cjs'));
  fs.copyFileSync(path.join(__dirname,'../scripts/evidence-path-analysis.cjs'),path.join(evidence,'path-analysis.cjs'));
  execFileSync(process.execPath,[path.join(evidence,'path-analysis.cjs')],{cwd:os.tmpdir(),stdio:'pipe'});
  const report=JSON.parse(fs.readFileSync(path.join(evidence,'post-path-analysis.json'),'utf8'));
  assert.equal(report.solo.paths,16);assert.equal(report.shared.paths,128);assert.equal(report.multiVoter.paths,2187);
  const current=require('../scripts/path-analysis.cjs').analyze();for(const key of ['solo','shared','multiVoter'])assert.deepEqual(report[key],current[key]);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
