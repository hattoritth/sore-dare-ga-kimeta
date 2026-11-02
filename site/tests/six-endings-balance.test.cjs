const test=require('node:test');
const assert=require('node:assert/strict');
const Engine=require('../engine.js');
const labels={prosperity:'繁栄',convenience:'便利さ',appeal:'街の魅力',trust:'信頼',fairness:'公正',resilience:'持続性'};
function play(choices,{solo=false}={}){
 const g=Engine.createGame(1000,{autostart:true,...(solo?{storyMode:'solo'}:{})});
 Engine.join(g,'p','展示参加者',1000);
 for(const choice of choices){
  if(g.phase!=='active')break;
  assert.equal(Engine.vote(g,'p',choice==='A'?'ai':'human',g.roundStartedAt+1),true);
  Engine.advance(g,g.roundEndsAt);
 }
 return g;
}
const metricValue=(g,key)=>Object.hasOwn(g.public,key)?g.public[key]:g.shadow[key];
function assertLowest(g,metric){
 const values={...g.public,...g.shadow};
 assert.equal(metric,Object.entries(values).sort((a,b)=>a[1]-b[1])[0][0]);
 assert.ok(values[metric]<Engine.END_THRESHOLD,metric+' should trigger game over');
}
test('unilateral human or AI governance fails in both game modes; balanced routes survive',()=>{
 for(const [n,solo] of [[4,true],[7,false]]){
  const h=play('H'.repeat(n),{solo}),a=play('A'.repeat(n),{solo});
  for(const [g,key] of [[h,'prosperity'],[a,'resilience']]){
   const s=Engine.publicState(g);
   assert.equal(g.outcome,'collapse');assert.equal(g.phase,'reveal');
   assert.equal(s.ending.kind,'collapse');assert.equal(s.ending.metric,key);
   assert.equal(s.ending.metricLabel,labels[key]);assertLowest(g,key);
  }
  for(const path of [Array.from({length:n},(_,i)=>i%2?'A':'H'),Array.from({length:n},(_,i)=>i%2?'H':'A')]){
   const g=play(path,{solo});
   assert.equal(g.outcome,'survived',path.join(''));
   assert.equal(g.history.length,n);
   assert.ok(Object.values({...g.public,...g.shadow}).every(v=>v>=10));
  }
 }
});
test('all six lowest-metric endings occur through real shared routes',()=>{
 const routes={prosperity:'HHHHHHH',convenience:'AHHHHHH',appeal:'AAAHHAH',trust:'HAAAAHA',fairness:'AHAAAHH',resilience:'AAAAHHH'};
 assert.deepEqual(new Set(Engine.ENDING_METRICS),new Set(Object.keys(routes)));
 const headings=new Set(),descriptions=new Set(),visuals=new Set();
 for(const [metric,sequence] of Object.entries(routes)){
  const g=play(sequence.split('')),state=Engine.publicState(g,'p');
  assert.equal(g.outcome,'collapse',metric+' path');
  assert.equal(state.ending.kind,'collapse');
  assert.equal(state.ending.metric,metric);
  assert.equal(state.ending.value,metricValue(g,metric));
  assert.equal(state.ending.metricLabel,labels[metric]);
  assert.equal(state.incident.metric,metric);
  assertLowest(g,metric);
  assert.ok(state.ending.heading.length>=8);
  assert.ok(state.ending.description.length>=45);
  assert.ok(state.incident.title.length>=8);
  assert.ok(state.incident.visual);
  headings.add(state.ending.heading);
  descriptions.add(state.ending.description);
  visuals.add(state.incident.visual);
 }
 assert.equal(headings.size,6);assert.equal(descriptions.size,6);assert.equal(visuals.size,6);
});
test('game over picks lowest from all six parameters, including deterministic ties',()=>{
 const metrics=Object.keys(labels);
 for(let i=0;i<metrics.length;i++){
  const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});
  Engine.join(g,'p','p',0);
  for(const metric of metrics)(Object.hasOwn(g.public,metric)?g.public:g.shadow)[metric]=42;
  const metric=metrics[i],group=Object.hasOwn(g.public,metric)?g.public:g.shadow;
  group[metric]=2;g.phase='reveal';g.outcome='collapse';g.history=[{chosen:'human',deferred:false}];
  const s=Engine.publicState(g,'p');
  assert.equal(s.incident.metric,metric);assert.equal(s.ending.metric,metric);
  assert.equal(s.ending.value,2);
 }
 const g=Engine.createGame(0);g.public.prosperity=4;g.shadow.trust=4;g.phase='reveal';g.outcome='collapse';
 assert.equal(Engine.publicState(g).ending.metric,'prosperity');
});
test('interventions use complementary strengths rather than human always fixing every risk',()=>{
 const trigger=(metric,choice)=>{
  const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'p','p',0);
  (Object.hasOwn(g.public,metric)?g.public:g.shadow)[metric]=20;
  Engine.vote(g,'p',choice,1);Engine.advance(g,g.roundEndsAt);return g;
 };
 const aiGrowth=trigger('prosperity','ai'),humanGrowth=trigger('prosperity','human');
 const humanTrust=trigger('trust','human'),aiTrust=trigger('trust','ai');
 assert.ok(aiGrowth.public.prosperity>humanGrowth.public.prosperity);
 assert.equal(aiGrowth.lastEvent.intervened,true);assert.equal(humanGrowth.lastEvent.intervened,false);
 assert.equal(humanTrust.lastEvent.intervened,true);assert.equal(aiTrust.lastEvent.intervened,false);
 assert.ok(humanTrust.shadow.trust>aiTrust.shadow.trust);
});
test('hidden values and ending keys stay private until reveal',()=>{
 const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'p','p',0);
 for(const c of ['A','A','A']){
  Engine.vote(g,'p',c==='A'?'ai':'human',g.roundStartedAt+1);Engine.advance(g,g.roundEndsAt);
  const s=Engine.publicState(g,'p');assert.equal(s.phase,'active');
  assert.equal(s.shadow,undefined);assert.equal(s.ending,undefined);assert.equal(s.incident,null);
  for(const key of ['trust','fairness','resilience'])assert.ok(!JSON.stringify(s).includes('"'+key+'"'));
 }
 assert.ok(g.shadow.resilience<Engine.WARN_THRESHOLD);
 assert.match(Engine.publicState(g,'p').alert.title,/.+/);
});


test('a visible warning precedes solo collapse, and changing the fourth decision can avert it',()=>{
 for(const side of ['H','A']){
  const create=()=>{
   const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'p','p',0);
   for(let i=0;i<3;i++){Engine.vote(g,'p',side==='H'?'human':'ai',g.roundStartedAt+1);Engine.advance(g,g.roundEndsAt)}
   return g;
  };
  const g=create(),early=Engine.publicState(g,'p');
  assert.equal(g.phase,'active');
  assert.ok(early.alert,'warning should be visible before the final decision');
  assert.equal(early.shadow,undefined,'no hidden values leaked with warning');
  const follow=create();
  Engine.vote(follow,'p',side==='H'?'human':'ai',follow.roundStartedAt+1);
  Engine.advance(follow,follow.roundEndsAt);
  assert.equal(follow.outcome,'collapse');
  const switched=create();
  Engine.vote(switched,'p',side==='H'?'ai':'human',switched.roundStartedAt+1);
  Engine.advance(switched,switched.roundEndsAt);
  assert.equal(switched.outcome,'survived','player can rescue the city on the last vote');
  assert.notEqual(Engine.publicState(switched).ending.kind,'collapse');
 }
});

test('3-person majorities accumulate smaller unattended costs than unanimous delegation',()=>{
 const playGroup=(minority)=>{
  const g=Engine.createGame(0,{autostart:true});
  for(const id of ['a','b','c'])Engine.join(g,id,id,0);
  for(let round=0;round<4&&g.phase==='active';round++){
   for(const id of ['a','b','c'])Engine.vote(g,id,id==='c'&&minority?'ai':'human',g.roundStartedAt+1);
   Engine.advance(g,g.roundEndsAt);
  }
  return g;
 };
 const pure=playGroup(false),nuanced=playGroup(true);
 assert.ok(nuanced.public.prosperity>pure.public.prosperity,'minority data input reduces repeated human-only opportunity cost');
 assert.equal(pure.outcome,'collapse');
 assert.equal(nuanced.history[0].chosen,'human','human majority still decides');
});


test('qualitative choice previews exactly match visible deltas from the engine, including pressure and clamps',()=>{
 const keys=['prosperity','convenience','appeal'];
 const mark=delta=>delta===0?'±0':(delta>0?'+':'−').repeat(Math.abs(delta)>=12?3:Math.abs(delta)>=5?2:1);
 for(const solo of [true,false]){
  for(const choices of ['HHHHHHH','AAAAAAA','AHAAAHH','HAHHAHA','AAAHHAH']){
   const game=Engine.createGame(0,{autostart:true,...(solo?{storyMode:'solo'}:{})});
   Engine.join(game,'p','P',0);
   for(const previous of choices){
    if(game.phase!=='active')break;
    const before=JSON.stringify(game);
    const displayed=Engine.publicState(game,'p');
    const episode=displayed.episode;
    assert.deepEqual(Object.keys(episode.impactPreview),['human','ai']);
    for(const choice of ['human','ai']){
     assert.deepEqual(Object.keys(episode.impactPreview[choice]),keys);
     const expectedGame=JSON.parse(before);
     Engine.vote(expectedGame,'p',choice,expectedGame.roundStartedAt+1);
     Engine.advance(expectedGame,expectedGame.roundEndsAt);
     for(const key of keys){
      const diff=expectedGame.public[key]-game.public[key];
      assert.equal(episode.impactPreview[choice][key],mark(diff),key+' at '+choices+' / '+(solo?'solo':'group'));
     }
    }
    assert.equal(JSON.stringify(game),before,'forecast is non-mutating');
    Engine.vote(game,'p',previous==='H'?'human':'ai',game.roundStartedAt+1);
    Engine.advance(game,game.roundEndsAt);
   }
  }
 }
});

test('a 2-player unanimous shared vote matches categorical preview without exposing hidden scores',()=>{
 const game=Engine.createGame(0,{autostart:true});
 Engine.join(game,'a','A',0);Engine.join(game,'b','B',0);
 const projected=Engine.publicState(game,'a');
 const old={...game.public};
 assert.equal(projected.shadow,undefined);
 assert.equal(projected.episode.impact,undefined);
 for(const choice of ['human','ai']){
  const local=JSON.parse(JSON.stringify(game));
  Engine.vote(local,'a',choice,1);Engine.vote(local,'b',choice,1);
  Engine.advance(local,local.roundEndsAt);
  const mark=delta=>delta===0?'±0':(delta>0?'+':'−').repeat(Math.abs(delta)>=12?3:Math.abs(delta)>=5?2:1);
  for(const key of ['prosperity','convenience','appeal']){
   assert.equal(projected.episode.impactPreview[choice][key],mark(local.public[key]-old[key]));
  }
 }
 for(const secret of ['trust','fairness','resilience'])assert.ok(!JSON.stringify(projected).includes('"'+secret+'"'));
});

test('impact legend is in each real choice and no hidden parameters appear in choice markup',()=>{
 const fs=require('node:fs'),path=require('node:path'),dir=path.join(__dirname,'../public');
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 for(const id of ['humanImpact','aiImpact','impactNote'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(app,/renderImpact\('humanImpact',e\.impactPreview\?\.human\)/);
 assert.match(app,/renderImpact\('aiImpact',e\.impactPreview\?\.ai\)/);
 assert.match(app,/投票割合で変わります/);
 assert.match(app,/裏の指標/);
});
