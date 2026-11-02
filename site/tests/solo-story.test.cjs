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
