const test=require('node:test'),assert=require('node:assert/strict');
const Press=require('../public/conference.js');
const cases={resilience:['S1','二つの避難先'],convenience:['S2','届くはずの買い物'],prosperity:['S2','届くはずの買い物'],fairness:['S3','保育園に入れない理由'],trust:['S4','帰り道が消えた'],appeal:['S5','届いていた言葉']};
function makeState(metric,kind='collapse'){
 const pub={prosperity:72,convenience:72,appeal:72};
 const shadow={trust:72,fairness:72,resilience:72};
 if(metric in pub)pub[metric]=kind==='collapse'?7:kind==='warning'?24:45;
 else shadow[metric]=kind==='collapse'?7:kind==='warning'?24:45;
 return {phase:'reveal',ending:{kind,metric,value:7},public:pub,shadow,history:[{round:1,heading:'診療所を増やす？',chosen:'human',result:'住民の声を聞いた'}],incident:kind==='collapse'?{title:'本編の出来事',metric}:null};
}
for(const [metric,[id,title]] of Object.entries(cases)){
 test('five scenarios: '+metric+' -> '+id+' (actual incident metric)',()=>{
  const f=Press.futureScenario(makeState(metric));
  assert.equal(f.id,id);assert.equal(f.title,title);assert.equal(f.severity,'heavy');
  assert.match(f.disclaimer,/2066年/);assert.match(f.disclaimer,/停止履歴/);
  assert.ok(f.letter.length>20&&f.signature.length>2);
 });
 test('three severity levels for '+id+' via engine ending kind',()=>{
  for(const [kind,want] of [['stable','light'],['warning','medium'],['collapse','heavy']]){
   const f=Press.futureScenario(makeState(metric,kind));
   assert.equal(f.severity,want);assert.ok(f.impact.length>20);
  }
 });
}
test('AI active explains, early/late stopped AI never speaks',()=>{
 const s=makeState('resilience'),active=Press.futureScenario(s,'active'),early=Press.futureScenario(s,'early'),late=Press.futureScenario(s,'late');
 assert.match(active.answers.join(' '),/市長代理AI：「/);
 assert.doesNotMatch(early.answers.join(' '),/市長代理AI：「/);
 assert.doesNotMatch(late.answers.join(' '),/市長代理AI：「/);
 assert.match(early.answers.join(' '),/AIは発話しない/);
 assert.match(late.answers.join(' '),/通知や変更記録/);
 assert.notEqual(early.answers.join(' '),late.answers.join(' '));
 assert.equal(early.severity,active.severity);assert.equal(late.theme,active.theme);
});
test('S5 heavy active AI apology is also machine-authored and reporter notices',()=>{
 const f=Press.futureScenario(makeState('appeal'),'active');
 assert.equal(f.id,'S5');assert.equal(f.severity,'heavy');
 assert.match(f.answers.join(' '),/お詫び申し上げます/);
 assert.match(f.answers.join(' '),/市長ご自身の言葉/);
 assert.doesNotMatch(Press.futureScenario(makeState('appeal'),'late').answers.join(' '),/市長代理AI：「/);
});
test('historical game record is not rewritten when choosing a hypothetical press AI status',()=>{
 const state=makeState('fairness');
 const before=JSON.stringify(state);
 for(const mode of ['active','early','late','invalid']){const f=Press.futureScenario(state,mode);assert.equal(f.id,'S3');assert.equal(f.severity,'heavy');}
 assert.equal(JSON.stringify(state),before);
});
test('pre-reveal and undecided never invent a 2066 incident or hidden metric-based scenario',()=>{
 assert.equal(Press.futureScenario({phase:'active',ending:{kind:'collapse',metric:'fairness'},public:{happiness:77}}),null);
 assert.equal(Press.futureScenario({phase:'reveal',ending:{kind:'undecided'},public:{},shadow:{}}),null);
});
test('all five scenario illustrations map to appropriate existing local SVG motifs',()=>{
 const map={safety:'豪雨',living:'交通網',fairness:'地区の分断',autonomy:'市役所',connection:'住民の暮らし'};
 const list=Object.entries(map).map(([theme,expected])=>{
  const svg=Press.sceneSvg('stable',null,theme);
  assert.match(svg,new RegExp(expected));assert.match(svg,/<svg/);assert.match(svg,/市長会見/);return svg;
 });
 assert.equal(new Set(list).size,5);
});
test('existing 6 BAD types and normal/true SVG remain available for legacy engine states',()=>{
 for(const key of Object.keys(cases))assert.ok(Press.sceneSvg('collapse',key).includes('市長会見'));
 assert.ok(Press.sceneSvg('true').includes('人とAIの協働'));
});
