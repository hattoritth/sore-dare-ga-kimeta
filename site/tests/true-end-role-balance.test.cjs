const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');

function runSolo(mask,{reason='access',response='review'}={}){
 const g=E.createGame(0,{autostart:true,storyMode:'solo'});E.join(g,'solo','市長',0);
 for(let round=0;round<4;round++){
  const choice=(mask>>round)&1?'ai':'human';
  if(choice==='human')assert.equal(E.chooseSoloDetail(g,'solo',round===0?{kind:'clinic',place:'suburb',reason}:{kind:'strategy',strategy:'voices'}),true);
  assert.equal(E.vote(g,'solo',choice,g.roundStartedAt+1),true);E.advance(g,g.roundEndsAt);
  if(round===0&&choice==='human'){
   assert.equal(E.clinicResponse(g,'solo',response,g.roundStartedAt+2)!==false,true);
   assert.equal(E.clinicResponse(g,'solo',response,g.roundStartedAt+3),false,'a second clinic response must not apply');
  }
 }
 return g;
}
function runGroup(mask){
 const g=E.createGame(0,{autostart:true});E.join(g,'group','参加者',0);
 for(let round=0;round<7;round++){
  g.votes={group:((mask>>round)&1)?'ai':'human'};E.advance(g,g.roundEndsAt);
  if(g.phase==='reveal')break;
 }
 return g;
}

test('solo TRUE is reachable only for the accountable H-H-H-A route with access rationale and applied response',()=>{
 const counts=[];
 for(let mask=0;mask<16;mask++){
  const g=runSolo(mask),ending=E.publicState(g).ending;
  if(ending.kind==='true')counts.push(mask);
  if(mask===0b1000)assert.equal(ending.kind,'true');
  else assert.notEqual(ending.kind,'true',`route ${mask.toString(2).padStart(4,'0')}`);
 }
 assert.deepEqual(counts,[0b1000]);
 assert.equal(runSolo(8).outcome,'survived','TRUE keeps the existing survived outcome value');
 assert.notEqual(E.publicState(runSolo(0)).ending.kind,'true','all-human is not TRUE');
 assert.notEqual(E.publicState(runSolo(15)).ending.kind,'true','all-AI is not TRUE');
 assert.notEqual(E.publicState(runSolo(8,{reason:'total'})).ending.kind,'true','volume alone is not an accessibility rationale');
});

test('all 128 group routes yield a narrow reachable TRUE set and exclude ties/no-votes',()=>{
 const truePaths=[];
 for(let mask=0;mask<128;mask++)if(E.publicState(runGroup(mask)).ending.kind==='true')truePaths.push(mask);
 assert.deepEqual(truePaths,[24,26], 'schooling needs human responsibility and office or transit needs AI evidence');
 assert.ok(truePaths.length>0&&truePaths.length<13,`${truePaths.length}/128 TRUE routes`);
 assert.notEqual(E.publicState(runGroup(72)).ending.kind,'true','AI-only school building cannot earn TRUE');
 assert.notEqual(E.publicState(runGroup(88)).ending.kind,'true','AI-run schooling without evidence-led office/transit fails TRUE');
 const fake=E.createGame(0);fake.phase='reveal';fake.outcome='survived';
 fake.history=Array.from({length:7},(_,i)=>({round:i+1,chosen:['human','ai','human','ai','ai','human','human'][i],deferred:false,noVotes:false}));
 assert.notEqual(E.publicState(fake).ending.kind,'true','unbuilt policies or artificial records cannot earn TRUE');
 for(const mask of truePaths){
  const g=runGroup(mask);
  assert.ok(Object.values({...g.public,...g.shadow}).every(value=>value>=E.WARN_THRESHOLD));
  assert.ok(Object.values({...g.public,...g.shadow}).every(value=>value>=E.TRUE_METRIC_FLOOR));
 }
 const tied=E.createGame(0,{autostart:true});E.join(tied,'a','A',0);E.join(tied,'b','B',0);
 for(let i=0;i<7;i++){tied.votes={a:'human',b:'ai'};E.advance(tied,tied.roundEndsAt);}
 assert.notEqual(E.publicState(tied).ending.kind,'true');
 const absent=E.createGame(0,{autostart:true});for(let i=0;i<7;i++)E.advance(absent,absent.roundEndsAt);
 assert.notEqual(E.publicState(absent).ending.kind,'true');
});

test('TRUE stays reveal-only, requires complete real history, and leaves ordinary endings intact',()=>{
 const active=E.createGame(0,{autostart:true,storyMode:'solo'});E.join(active,'p','P',0);
 const activeState=E.publicState(active,'p',0);
 assert.equal(activeState.ending,undefined);
 for(const secret of ['trust','fairness','resilience'])assert.equal(JSON.stringify(activeState).includes(secret),false);
 const mocked=E.createGame(0);mocked.phase='reveal';mocked.history=[];
 assert.equal(E.publicState(mocked).ending.kind,'stable','mocked reveal without full history cannot earn TRUE');
 const incomplete=E.createGame(0,{storyMode:'solo'});incomplete.phase='reveal';
 incomplete.history=Array.from({length:4},(_,i)=>({chosen:['human','human','human','ai'][i],noVotes:false,deferred:false}));
 assert.notEqual(E.publicState(incomplete).ending.kind,'true','matching mocked choices without real clinic detail and response cannot earn TRUE');
 mocked.history=[{chosen:'human',deferred:false,noVotes:false}];mocked.public.appeal=29;
 assert.equal(E.publicState(mocked).ending.kind,'warning');
 mocked.public.appeal=9;assert.equal(E.publicState(mocked).ending.kind,'collapse');
 const undecided=E.createGame(0);undecided.phase='reveal';undecided.history=[{noVotes:true,deferred:true}];
 assert.equal(E.publicState(undecided).ending.kind,'undecided');
});

test('normal, warning, BAD, and TRUE endings have distinct export scene and labels',()=>{
 const Card=require('../public/ending-card.js');
 const app=require('node:fs').readFileSync(require.resolve('../public/app.js'),'utf8');
 for(const label of ['TRUE END','NORMAL ·','WARNING ·','BAD END','未決'])assert.ok(app.includes(label),`app result label ${label}`);
 assert.equal(Card.sceneSvg('true').includes('TRUE END'),true);
 assert.equal(Card.sceneSvg('neutral').includes('課題の残る街'),true,'no-vote ending keeps a neutral scene');
 assert.equal(Card.buildPreview({kind:'true',title:'TRUE END',description:'役割を確かめた',metrics:[]}).includes('役割を確かめた'),true);
 assert.equal(Card.buildPreview({kind:'warning',title:'課題が残る'}).includes('課題が残る'),true);
});

test('result screen drops redundant group maximum and minimum labels',()=>{
 const app=require('node:fs').readFileSync(require.resolve('../public/app.js'),'utf8');
 assert.doesNotMatch(app,/この群の最高|この群の最低/);
 assert.match(app,/終了水準/);assert.match(app,/警告水準/);
});
