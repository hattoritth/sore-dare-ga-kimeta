const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');

const all=[...Object.keys(E.INITIAL_PUBLIC),...Object.keys(E.INITIAL_SHADOW)];
function solo(optionByRound){
 const g=E.createGame(0,{autostart:true,storyMode:'solo'});E.join(g,'p','参加者',0);
 for(let round=0;round<4;round++){
  const state=E.publicState(g,'p',round+1),option=state.episode.options.find(x=>x.id.endsWith('-'+optionByRound[round]));
  assert.ok(option,`option exists in solo episode ${round}`);assert.equal(E.vote(g,'p',option.id,round+1),true);E.advance(g,g.roundEndsAt);
  if(g.phase==='reveal')break;
 }
 return g;
}

test('v23 happiness is a rounded arithmetic mean and all six values remain secret until reveal',()=>{
 const g=E.createGame(0);assert.equal(E.happiness(g),71);
 g.public.prosperity=60;g.public.convenience=62;g.public.appeal=67;g.shadow.trust=81;g.shadow.fairness=78;g.shadow.resilience=77;
 assert.equal(E.happiness(g),71);
 for(const phase of ['waiting','lobby','active']){
  if(phase==='lobby')E.join(g,'p','参加者',0);
  if(phase==='active'){g.phase='active';g.roundEndsAt=100000;}
  const state=E.publicState(g,'p',1),json=JSON.stringify(state);
  assert.deepEqual(state.public,{happiness:71});assert.equal(state.shadow,undefined);
  for(const key of all)assert.ok(!Object.hasOwn(state.public,key));
  assert.ok(!json.includes('impactPreview'));assert.ok(!json.includes('optionCounts'));assert.ok(!json.includes('trust'));
 }
 g.phase='reveal';g.outcome='survived';const reveal=E.publicState(g,'p',1);
 assert.deepEqual(Object.keys(reveal.public).sort(),Object.keys(E.INITIAL_PUBLIC).sort());
 assert.deepEqual(Object.keys(reveal.shadow).sort(),Object.keys(E.INITIAL_SHADOW).sort());
});

test('each group episode offers four episode-scoped concrete actions with distinct effects',()=>{
 const supported={clinic:['clinic','lot'],office:['dc','market','solar'],waterfront:['market','floodgate','lot'],energy:['solar','dc','lot'],transit:['transit','market','lot'],parkA:['park','mixed','dc'],school:['school','homes','lot']};
 for(let round=0;round<E.MAX_ROUNDS;round++){
  const g=E.createGame(0,{autostart:true});g.round=round;E.join(g,'p','参加者',0);
  const options=E.publicState(g,'p',1).episode.options;
  assert.equal(options.length,4);assert.equal(new Set(options.map(x=>x.id)).size,4);
  assert.equal(options.filter(x=>x.id.endsWith('-ai')).length,1);
  assert.equal(options.filter(x=>!x.id.endsWith('-ai')).length,3);
  assert.ok(options.every(x=>x.id.startsWith(`e${round}-`)));
  const outcomes=options.map(option=>{const sim=E.createGame(0,{autostart:true});sim.round=round;E.join(sim,'p','参加者',0);E.vote(sim,'p',option.id,1);E.advance(sim,sim.roundEndsAt);const building=sim.built[E.EPISODES[round].site];assert.ok(supported[E.EPISODES[round].site].includes(building),`supported ${building} outcome for ${E.EPISODES[round].site}`);return JSON.stringify({effect:sim.history[0].winningEffect,metrics:{...sim.public,...sim.shadow},building});});
  assert.equal(new Set(outcomes).size,4,`four different model outcomes in episode ${round+1}`);
 }
});

test('plurality selects an exact option, records votes and applies only its actual outcome',()=>{
 const g=E.createGame(0,{autostart:true});for(const id of ['a','b','c'])E.join(g,id,id,0);
 const opts=E.publicState(g,'a',1).episode.options;const before={...g.public,...g.shadow};
 for(const id of ['a','b'])assert.equal(E.vote(g,id,opts[1].id,10),true);
 assert.equal(E.vote(g,'c',opts[2].id,10),true);E.advance(g,g.roundEndsAt);
 assert.equal(g.history[0].winningOption,opts[1].id);assert.equal(g.history[0].winningLabel,opts[1].label);
 assert.deepEqual(g.history[0].participantVotes,[opts[1].id,opts[1].id,opts[2].id]);
 assert.deepEqual(g.history[0].optionCounts,{[opts[0].id]:0,[opts[1].id]:2,[opts[2].id]:1,[opts[3].id]:0});
 assert.notDeepEqual({...g.public,...g.shadow},before);assert.equal(g.built.clinic,'lot');
});

test('distinct option tie and no votes defer without changing city state',()=>{
 for(const voting of ['tie','none']){
  const g=E.createGame(0,{autostart:true});for(const id of ['a','b'])E.join(g,id,id,0);
  const before={public:{...g.public},shadow:{...g.shadow},built:{...g.built}},opts=E.publicState(g,'a',1).episode.options;
  if(voting==='tie'){E.vote(g,'a',opts[0].id,1);E.vote(g,'b',opts[1].id,2);}
  E.advance(g,g.roundEndsAt);assert.equal(g.history[0].chosen,voting==='tie'?'mixed':'none');
  assert.deepEqual(g.public,before.public);assert.deepEqual(g.shadow,before.shadow);assert.deepEqual(g.built,before.built);
 }
});

test('all four solo episodes accept their own options and option choice changes metrics',()=>{
 const ids=[];const a=solo(['listen','audit','community','ai']);const b=solo(['ai','ai','ai','ai']);
 assert.ok(a.history.length>=1);assert.ok(b.history.length>=1);
 const g=E.createGame(0,{autostart:true,storyMode:'solo'});E.join(g,'p','参加者',0);
 for(let round=0;round<4;round++){const state=E.publicState(g,'p',round+1);assert.equal(state.episode.options.length,4);assert.ok(state.episode.options.every(x=>x.id.startsWith(`e${[0,4,2,3][round]}-`)));const id=state.episode.options[0].id;ids.push(id);E.vote(g,'p',id,round+1);E.advance(g,g.roundEndsAt);if(g.phase==='reveal')break;}
 assert.ok(ids.length>=3);assert.notDeepEqual(a.public,b.public);
});

test('episode option ids reject arbitrary and stale actions while legacy votes still map safely',()=>{
 const g=E.createGame(0,{autostart:true});E.join(g,'p','参加者',0);
 assert.equal(E.vote(g,'p','chosen-by-client',1),false);
 assert.equal(E.vote(g,'p','e1-listen',1),false);
 assert.equal(E.vote(g,'p','human',1),true);assert.equal(g.votes.p,'human');assert.match(g.optionVotes.p,/^e0-/);
});


test('built facilities remain visible after a decision before reveal, without disclosing six metric scores',()=>{
 const g=E.createGame(0,{autostart:true});E.join(g,'p','参加者',0);const option=E.publicState(g,'p',1).episode.options[0];
 assert.equal(E.vote(g,'p',option.id,1),true);E.advance(g,g.roundEndsAt);
 const state=E.publicState(g,'p',g.roundStartedAt+1);assert.equal(state.phase,'active');
 assert.equal(state.built.clinic,'clinic');assert.deepEqual(Object.keys(state.public),['happiness']);assert.equal(state.shadow,undefined);
});

test('each concrete action builds a district-supported facility, and the result describes it',()=>{
 const allowed={clinic:['clinic','lot'],office:['market','solar','dc'],waterfront:['floodgate','lot','market'],energy:['solar','lot','dc'],transit:['transit','lot','market'],parkA:['mixed','park','dc'],school:['school','lot','homes']};
 for(let round=0;round<E.MAX_ROUNDS;round++){const options=E.optionsFor?E.optionsFor(E.EPISODES[round],round):null;
  if(options){for(const option of options)assert.ok(allowed[E.EPISODES[round].site].includes(option.build),`unsupported facility ${option.build}`);}
  const g=E.createGame(0,{autostart:true});E.join(g,'p','参加者',0);g.round=round;const opts=E.publicState(g,'p',1).episode.options;
  for(const choice of opts){const sim=E.createGame(0,{autostart:true});E.join(sim,'p','参加者',0);sim.round=round;assert.equal(E.vote(sim,'p',choice.id,1),true);E.advance(sim,sim.roundEndsAt);
   const type=sim.built[E.EPISODES[round].site];assert.ok(allowed[E.EPISODES[round].site].includes(type),`${choice.id} produced ${type}`);assert.ok(sim.history.at(-1).result.length>10);
  }
 }
});
