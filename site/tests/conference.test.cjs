const test=require('node:test'),assert=require('node:assert/strict');
const {build}=require('../public/conference.js');
const Press=require('../public/conference.js');
const keys=['prosperity','convenience','appeal','trust','fairness','resilience'];
for(const [metric,cue] of Object.entries({prosperity:'街の活気',convenience:'移動の仕組み',appeal:'街を離れる',trust:'決定の説明',fairness:'地区の間',resilience:'豪雨で街'})){
 test(`conference matches actual ${metric} incident and ending metric`,()=>{const state={phase:'reveal',ending:{kind:'collapse',metric,value:7},incident:{metric,title:'実際の事象'},public:{prosperity:1,convenience:2,appeal:3},shadow:{trust:4,fairness:5,resilience:6},history:[]};const c=build(state);assert.match(c.question,/実際の事象/);assert.ok(c.question.includes(cue));assert.equal(c.causeMetric,metric);assert.equal(c.metrics.find(x=>x.key===metric).value,metric in state.public?state.public[metric]:state.shadow[metric]);});
}
test('conference differentiates TRUE, stable, warning, undecided and no invented disaster',()=>{assert.match(build({ending:{kind:'true'},public:{},shadow:{}}).question,/役割とAIに任せた運用/);assert.match(build({ending:{kind:'stable'},public:{},shadow:{}}).question,/街は続いて/);assert.match(build({ending:{kind:'warning',risks:[{title:'課題'}]},public:{},shadow:{}}).question,/大きな事故には至っていません/);assert.match(build({ending:{kind:'undecided'},public:{},shadow:{}}).question,/保留/);});
test('metrics expose exactly six actual values in visible and hidden groups',()=>{const state={phase:'reveal',ending:{kind:'stable'},public:{prosperity:11,convenience:22,appeal:33},shadow:{trust:44,fairness:55,resilience:66}};const m=build(state).metrics;assert.equal(m.length,6);assert.deepEqual(m.map(x=>x.value),[11,22,33,44,55,66]);assert.equal(m.filter(x=>x.group==='public').length,3);assert.equal(m.filter(x=>x.group==='shadow').length,3);});
test('human, AI, deferred and no-vote explanations follow history records',()=>{const make=chosen=>build({ending:{kind:'stable'},public:{},shadow:{},history:[{heading:'診療所',chosen,result:'実際の記録'}]}).answers[0];assert.match(make('human'),/人の方針が選ばれました/);assert.match(make('ai'),/AIに委ねる方針が選ばれました/);assert.match(make('ai'),/具体策の選定に使われた経緯は、この記録だけでは確認できません/);assert.match(make('mixed'),/保留され、施策は実施されていません/);assert.match(make('none'),/投票なしで保留/);});
test('clinic detail appears only when a browser clinic record is supplied',()=>{const state={ending:{kind:'stable'},public:{},shadow:{},history:[{heading:'診療所',chosen:'human',result:'記録'}]};assert.ok(!build(state).answers[0].includes('郊外'));assert.match(build(state,{kind:'human',place:'suburb',reason:'access',response:'support'}).answers[0],/郊外を選び、通院が難しい人への届きやすさ/);assert.match(build(state,{kind:'human',place:'suburb',reason:'access',response:'support'}).answers[0],/通院の支援を先に進める方針を選びました/);});
test('public state before reveal cannot build hidden metrics',()=>{assert.deepEqual(build({phase:'active',public:{prosperity:50,convenience:50,appeal:50},history:[]}).metrics,[]);});
test('all six BAD causes and four non-BAD states have separate local conference illustrations',()=>{
 const bad=['prosperity','convenience','appeal','trust','fairness','resilience'];
 const badScenes=bad.map(key=>Press.sceneSvg('collapse',key));
 assert.equal(new Set(badScenes).size,6);
 for(const svg of badScenes){assert.match(svg,/<svg[^>]+role="img"/);assert.match(svg,/市長会見/);assert.match(svg,/交通網|公共サービス|住民の暮らし|市役所|地区の分断|豪雨/);}
 const other=['normal','true','warning','undecided'].map(kind=>Press.sceneSvg(kind));assert.equal(new Set(other).size,4);assert.ok(other.every(svg=>svg.includes('市長会見')));
 assert.deepEqual(Object.keys(Press.outcomeNames),bad);
});
