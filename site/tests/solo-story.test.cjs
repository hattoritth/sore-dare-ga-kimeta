const test=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../engine.js');

test('solo story is four consequential decisions, with four distinct agents',()=>{
 const game=Engine.createGame(1000,{autostart:true,storyMode:'solo'});
 Engine.join(game,'player','プレイヤー',1000);
 const agents=[];const choices=['human','ai','human','ai'];
 for(let round=0;round<4;round++){
   const state=Engine.publicState(game,'player',1000+round*100000);
   assert.equal(state.roundTotal,4);
   assert.equal(state.shadow,undefined);
   agents.push(state.episode.agent);
   game.roundEndsAt=2000+round*100000;
   assert.equal(Engine.vote(game,'player',choices[round],game.roundEndsAt-100),true);
   assert.equal(Engine.advance(game,game.roundEndsAt),true);
   assert.equal(game.history.length,round+1);
 }
 assert.deepEqual(agents,['ヒカリ','ソラ','ナギ','ミドリ']);
 const end=Engine.publicState(game,'player',500000);
 assert.equal(end.phase,'reveal');
 assert.equal(end.outcome,'survived');
 assert.equal(end.history.length,4);
 assert.equal(typeof end.shadow.trust,'number');
});

test('solo AI-only delegation raises visible gains but ends in a resilience crisis',()=>{
 const game=Engine.createGame(1000,{autostart:true,storyMode:'solo'});
 Engine.join(game,'player','プレイヤー',1000);
 for(let round=0;round<4;round++){
  game.roundEndsAt=2000+round*100000;
  assert.equal(Engine.vote(game,'player','ai',game.roundEndsAt-100),true);
  assert.equal(Engine.advance(game,game.roundEndsAt),true);
  if(game.phase==='reveal')break;
 }
 assert.equal(game.phase,'reveal');
 assert.equal(game.outcome,'collapse');
 assert.equal(game.history.length,4);
 assert.ok(game.history.at(-1).hidden.resilience<10);
 assert.equal(Engine.publicState(game,'player').ending.metric,'resilience');
 assert(game.public.prosperity>Engine.INITIAL_PUBLIC.prosperity);
 assert(game.shadow.resilience<Engine.INITIAL_SHADOW.resilience);
});

test('solo human intervention after a resilience warning reduces risk',()=>{
 const game=Engine.createGame(1000,{autostart:true,storyMode:'solo'});Engine.join(game,'player','プレイヤー',1000);
 for(const choice of ['ai','ai','ai','human']){
  game.roundEndsAt+=100000;
  assert.equal(Engine.vote(game,'player',choice,game.roundEndsAt-100),true);
  Engine.advance(game,game.roundEndsAt);
 }
 assert.equal(game.outcome,'survived');
 assert.equal(game.history[2].hidden.resilience,11);
 assert.equal(game.history[3].intervened,true);
 assert.equal(game.outcome,'survived');
 assert.equal(game.shadow.resilience,33);
});

test('shared city remains seven rounds without solo story mode',()=>{
 const game=Engine.createGame(1000,{autostart:true});
 Engine.join(game,'one','一人',1000);
 assert.equal(Engine.publicState(game,'one',1000).roundTotal,7);
 assert.equal(Engine.publicState(game,'one',1000).episode.heading,Engine.EPISODES[0].heading);
 game.roundEndsAt=4000;Engine.vote(game,'one','human',3000);Engine.advance(game,4000);
 assert.equal(Engine.publicState(game,'one',4000).episode.heading,Engine.EPISODES[1].heading);
});

test('solo clinic details and the later response each change real metrics exactly once',()=>{
 const run=(place,reason,response)=>{
  const g=Engine.createGame(1000,{autostart:true,storyMode:'solo'});Engine.join(g,'solo','あなた',1000);
  assert.equal(Engine.chooseSoloDetail(g,'solo',{kind:'clinic',place,reason}),true);
  assert.equal(Engine.vote(g,'solo','human',1001),true);g.roundEndsAt=2000;Engine.advance(g,2000);
  return {g,response};
 };
 const station=run('station','total','support'),suburb=run('suburb','access','support');
 for(const {g} of [station,suburb]){
  assert.equal(g.phase,'active');assert.equal(g.round,1);assert.equal(g.awaitingClinicResponse,true);
  const state=Engine.publicState(g,'solo',2100);assert.equal(state.shadow,undefined);assert.equal(state.ending,undefined);
  for(const key of ['trust','fairness','resilience'])assert.ok(!JSON.stringify(state).includes('"'+key+'"'));
  assert.equal(Engine.vote(g,'solo','ai',2101),false);assert.equal(Engine.advance(g,999999),false);
 }
 assert.notDeepEqual(station.g.public,suburb.g.public);assert.notDeepEqual(station.g.shadow,suburb.g.shadow);
 const before={...station.g.public};
 const applied=Engine.clinicResponse(station.g,'solo','support',2200);
 assert.ok(applied);assert.equal(station.g.awaitingClinicResponse,false);assert.equal(applied.public.convenience-before.convenience,3);
 assert.equal(station.g.history[0].clinicResponseApplied,true);assert.equal(station.g.history[0].clinicResponse,'support');
 const after={...station.g.public};assert.equal(Engine.clinicResponse(station.g,'solo','support',2300),false);assert.deepEqual(station.g.public,after);
 assert.equal(station.g.history[0].visible.convenience,station.g.public.convenience);
 assert.match(station.g.history[0].result,/通院支援を先に進め/);
});

test('solo subchoices reject malformed, stale, duplicate and shared-game input',()=>{
 const solo=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(solo,'solo','あなた',0);
 for(const bad of [null,{}, {kind:'clinic',place:'elsewhere',reason:'access'}, {kind:'strategy',strategy:'voices'}])assert.equal(Engine.chooseSoloDetail(solo,'solo',bad),false);
 assert.equal(Engine.chooseSoloDetail(solo,'missing',{kind:'clinic',place:'station',reason:'total'}),false);
 assert.equal(Engine.chooseSoloDetail(solo,'solo',{kind:'clinic',place:'station',reason:'total'}),true);
 assert.equal(Engine.chooseSoloDetail(solo,'solo',{kind:'clinic',place:'suburb',reason:'access'}),false);
 assert.equal(Engine.vote(solo,'solo','human',1),true);
 assert.equal(Engine.chooseSoloDetail(solo,'solo',{kind:'clinic',place:'suburb',reason:'access'}),false);
 const group=Engine.createGame(0,{autostart:true});Engine.join(group,'p','P',0);
 assert.equal(Engine.chooseSoloDetail(group,'p',{kind:'clinic',place:'station',reason:'total'}),false);
 assert.equal(Engine.clinicResponse(group,'p','support',1),false);
});

test('later solo human strategies have distinct, non-dominant tradeoffs and hidden effects stay private',()=>{
 const resolve=(strategy)=>{const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});g.round=1;Engine.join(g,'solo','あなた',0);Engine.chooseSoloDetail(g,'solo',{kind:'strategy',strategy});Engine.vote(g,'solo','human',1);Engine.advance(g,g.roundEndsAt);return g;};
 const voices=resolve('voices'),balance=resolve('balance');
 assert.notDeepEqual(voices.public,balance.public);assert.notDeepEqual(voices.shadow,balance.shadow);
 assert.ok(voices.shadow.trust>balance.shadow.trust);assert.ok(balance.shadow.fairness>voices.shadow.fairness);
 for(const g of [voices,balance]){const s=Engine.publicState(g,'solo');assert.equal(s.shadow,undefined);assert.ok(!JSON.stringify(s).includes('"resilience"'));assert.match(g.history[0].result,/方針を実施した/);}
});

test('solo action IDs are agenda-scoped and include no numeric previews',()=>{
 const sequence=[0,4,2,3];for(let round=0;round<4;round++){const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'solo','あなた',0);g.round=round;const state=Engine.publicState(g,'solo');assert.equal(state.episode.options.length,4);assert.ok(state.episode.options.every(o=>o.id.startsWith(`e${sequence[round]}-`)));assert.equal(state.episode.impactPreview,undefined);assert.deepEqual(Object.keys(state.public),['happiness']);}
});

test('old clinic and strategy forms are removed while ending-only values remain available',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/index.html'),'utf8'),Engine=require('../engine.js');
 assert.doesNotMatch(html,/clinicFollowup|clinicChoice|clinicResponse|strategyChoice|data-strategy/);
 const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'p','P',0);const active=Engine.publicState(g,'p');assert.deepEqual(active.public,{happiness:71});assert.equal(active.shadow,undefined);
 g.phase='reveal';const ending=Engine.publicState(g,'p');assert.deepEqual(Object.keys(ending.shadow).sort(),['fairness','resilience','trust']);
});

test('shared state offers four concrete choices and exposes only aggregate happiness',()=>{
 const g=Engine.createGame(0,{autostart:true});Engine.join(g,'p','参加者',0);const state=Engine.publicState(g,'p',1);
 assert.equal(state.episode.options.length,4);assert.equal(state.episode.options.filter(x=>x.id.endsWith('-ai')).length,1);assert.equal(state.episode.impactPreview,undefined);assert.deepEqual(state.public,{happiness:71});
});

test('round one waits for the human clinic response before reveal and then checks ending thresholds',()=>{
 const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'solo','あなた',0);g.public.prosperity=1;
 assert.equal(Engine.chooseSoloDetail(g,'solo',{kind:'clinic',place:'station',reason:'total'}),true);
 Engine.vote(g,'solo','human',1);Engine.advance(g,g.roundEndsAt);
 assert.equal(g.phase,'active');assert.equal(g.awaitingClinicResponse,true);
 const pending=Engine.publicState(g,'solo');assert.equal(pending.shadow,undefined);assert.equal(pending.ending,undefined);
 const done=Engine.clinicResponse(g,'solo','support',3000);
 assert.ok(done);assert.equal(done.phase,'reveal');assert.equal(g.outcome,'collapse');
 assert.equal(Engine.publicState(g,'solo').shadow.resilience,g.shadow.resilience);
});

test('all sixteen four-round human/AI paths with representative details finish consistently',()=>{
 for(let mask=0;mask<16;mask++){
  const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'solo','あなた',0);
  for(let round=0;round<4&&g.phase==='active';round++){
   g.roundEndsAt=Date.now()+1000;
   const human=!!(mask&(1<<round));
   if(human){
    const detail=round===0?{kind:'clinic',place:mask%2?'suburb':'station',reason:mask%4<2?'access':'total'}:{kind:'strategy',strategy:mask%2?'voices':'balance'};
    assert.equal(Engine.chooseSoloDetail(g,'solo',detail),true,`mask=${mask} round=${round+1}`);
   }
   assert.equal(Engine.vote(g,'solo',human?'human':'ai',Date.now()+1),true);
   Engine.advance(g,g.roundEndsAt);
   if(g.awaitingClinicResponse){assert.ok(Engine.clinicResponse(g,'solo',['review','support','revise'][mask%3],g.roundEndsAt+1));}
  }
  assert.equal(g.phase,'reveal',`mask=${mask}`);assert.ok(['collapse','survived'].includes(g.outcome));
  assert.ok(g.history.length<=4,`mask=${mask}`);if(g.outcome==='survived')assert.equal(g.history.length,4,`mask=${mask}`);
  assert.ok(Object.values({...g.public,...g.shadow}).every(Number.isFinite),`mask=${mask}`);
  if(g.outcome==='survived')assert.ok(Object.values({...g.public,...g.shadow}).every(v=>v>=10),`no false success: mask=${mask}`);
 }
});
