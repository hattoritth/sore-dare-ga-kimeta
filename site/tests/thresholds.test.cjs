const test=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../engine.js');
const metrics=['prosperity','convenience','appeal','trust','fairness','resilience'];
const metricLabels={prosperity:'繁栄',convenience:'便利さ',appeal:'街の魅力',trust:'信頼',fairness:'公正',resilience:'持続性'};
const game=()=>{const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'visitor','参加者',0);return g;};
const keyGroup=(g,key)=>Object.hasOwn(g.public,key)?g.public:g.shadow;

test('warning is strict <30 for every public and hidden metric, with no hidden numbers in response',()=>{
 assert.equal(Engine.WARN_THRESHOLD,30);
 for(const key of metrics){
  const g=game(),group=keyGroup(g,key);
  group[key]=30;
  assert.equal(Engine.publicState(g,'visitor',0).alert,null,`${key} at 30`);
  group[key]=29;
  const state=Engine.publicState(g,'visitor',0);
  assert.equal(typeof state.alert.title,'string',`${key} at 29`);
  assert.equal(state.alert.count,undefined);assert.doesNotMatch(JSON.stringify(state.alert),/繁栄|便利さ|街の魅力|信頼|公正|持続性/);
  assert.equal(state.shadow,undefined);
  assert.equal(state.incident,null);
  for(const hidden of ['trust','fairness','resilience'])assert.ok(!JSON.stringify(state).includes('"'+hidden+'"'));
 }
});

test('human-led follow-up mitigates warned metrics and leaves a decision record',()=>{
 const g=game();g.shadow.trust=25;g.public.appeal=25;
 assert.equal(Engine.publicState(g,'visitor',0).alert.count,undefined);
 Engine.vote(g,'visitor','human',10);Engine.advance(g,g.roundEndsAt);
 assert.equal(g.shadow.trust,40);
 assert.equal(g.public.appeal,34);
 assert.equal(g.lastEvent.intervened,true);
 assert.equal(Engine.publicState(g,'visitor').alert,null);
});

test('shared human majority (not AI majority) is the warning intervention',()=>{
 const g=Engine.createGame(0,{autostart:true});g.shadow.trust=25;
 for(const id of ['a','b','c'])Engine.join(g,id,id,0);
 const op=Engine.publicState(g,'a').episode.options;Engine.vote(g,'a',op[0].id,10);Engine.vote(g,'b',op[0].id,10);Engine.vote(g,'c',op[1].id,10);
 Engine.advance(g,g.roundEndsAt);
 assert.equal(g.lastEvent.chosen,'human');assert.equal(g.lastEvent.intervened,true);
 assert.ok(g.shadow.trust>20);
 const h=Engine.createGame(0,{autostart:true});h.shadow.trust=25;
 for(const id of ['a','b','c'])Engine.join(h,id,id,0);
 const hp=Engine.publicState(h,'a').episode.options;Engine.vote(h,'a',hp[3].id,10);Engine.vote(h,'b',hp[3].id,10);Engine.vote(h,'c',hp[0].id,10);
 Engine.advance(h,h.roundEndsAt);
 assert.equal(h.lastEvent.intervened,false);
 assert.ok(g.shadow.trust>h.shadow.trust);
});

test('strict <10 ends the game for all six metrics and provides specific consequences',()=>{
 assert.equal(Engine.END_THRESHOLD,10);
 for(const key of metrics){
  const g=game(),group=keyGroup(g,key);g.round=2;group[key]=0;
  Engine.vote(g,'visitor',['prosperity','convenience'].includes(key)?'human':'ai',10);Engine.advance(g,g.roundEndsAt);
  const state=Engine.publicState(g,'visitor',g.roundEndsAt);
  assert.equal(state.phase,'reveal',`${key} should end`);
  assert.equal(state.outcome,'collapse');
  assert.equal(state.incident.metric,key,`${key} should be the reported trigger`);
  assert.ok(state.incident.title);
  assert.ok(metricLabels[state.incident.metric]);
  assert.equal(typeof state.incident.title,'string');
  assert.equal(typeof state.incident.description,'string');
  assert.equal(typeof state.incident.visual,'string');
 }
 const strict=game();strict.shadow.trust=10;
 Engine.advance(strict,strict.roundEndsAt);
 assert.equal(strict.shadow.trust,10);
 assert.equal(strict.phase,'active','at 10 must not end');
});

test('episode effects and decision ordering produce distinct city histories',()=>{
 assert.ok(Engine.EPISODES.every(e=>!('impact' in e)),'decision deltas must not be exposed in active episode data');
 const run=choices=>{
  const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'visitor','参加者',0);
  for(const choice of choices){Engine.vote(g,'visitor',choice,1);Engine.advance(g,g.roundEndsAt);if(g.phase==='reveal')break;}
  return g;
 };
 const first=run(['ai','human','ai','human']),second=run(['human','ai','human','ai']);
 assert.notDeepEqual(first.history.map(x=>x.visible),second.history.map(x=>x.visible),'same vote count in a different episode order should alter the city');
 const allHuman=run(['human','human','human','human']);
 assert.ok(new Set(allHuman.history.map(x=>JSON.stringify(x.visible))).size>1,'each episode should shape its visible result');
});

test('new city has independent session identity for reconnecting displays',()=>{
 const first=game(),second=Engine.createGame(500);
 assert.notEqual(Engine.publicState(first).cityStartedAt,Engine.publicState(second).cityStartedAt);
});
