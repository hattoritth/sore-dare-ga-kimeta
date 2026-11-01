const test=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../engine.js');

function run(choices,solo){
 const game=Engine.createGame(0,{autostart:true,storyMode:solo?'solo':undefined});
 Engine.join(game,'player','参加者',0);
 for(const choice of choices){
  Engine.vote(game,'player',choice==='A'?'ai':'human',game.roundStartedAt+100);
  Engine.advance(game,game.roundEndsAt);
  if(game.phase==='reveal')break;
 }
 return game;
}
function paths(rounds){
 return Array.from({length:2**rounds},(_,mask)=>Array.from({length:rounds},(_,i)=>(mask>>(rounds-1-i))&1?'A':'H'));
}

test('all 16 solo paths complete with choice-sensitive outcomes and recorded warnings',()=>{
 const results=paths(4).map(path=>({path,game:run(path,true)}));
 assert.equal(results.length,16);
 assert.ok(results.every(x=>x.game.phase==='reveal'));
 assert.ok(new Set(results.map(x=>JSON.stringify({...x.game.public,...x.game.shadow}))).size>1);
 assert.ok(results.every(x=>x.game.outcome==='survived'),'solo choices can end with warning-level strain without forcing a crisis');
 assert.ok(results.some(x=>x.game.history.some(h=>h.intervened)));
 assert.ok(results.some(x=>x.game.history.some(h=>Object.values({...h.visible,...h.hidden}).some(v=>v<30))));
});

test('all 128 shared paths complete or collapse deterministically across seven episodes',()=>{
 const results=paths(7).map(path=>({path,game:run(path,false)}));
 assert.equal(results.length,128);
 assert.ok(results.every(x=>x.game.phase==='reveal'));
 assert.ok(new Set(results.map(x=>JSON.stringify({...x.game.public,...x.game.shadow}))).size>1);
 assert.ok(results.some(x=>x.game.outcome==='collapse'));
 assert.ok(results.some(x=>x.game.outcome==='survived'));
});
