'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('../public/conference.js');
const ReflectionReport=require('../public/reflection-report.js');
const EndingCard=require('../public/ending-card.js');
const names=['にぎわい','便利さ','住み心地','市への信頼','公平さ','未来への備え'];
const values={prosperity:66,convenience:55,appeal:44,trust:33,fairness:22,resilience:11};
const state={phase:'reveal',ending:{kind:'warning',heading:'街は課題を残した。',description:'住民の声を確かめよう。',risks:[]},public:{prosperity:66,convenience:55,appeal:44},shadow:{trust:33,fairness:22,resilience:11},history:[]};
test('the same approachable names label actual six values in conference, report and radar',()=>{
 const detail=build(state);
 assert.deepEqual(detail.metrics.map(x=>x.label),names);
 assert.deepEqual(detail.metrics.map(x=>Number(x.value)),Object.values(values));
 for(const m of detail.metrics)assert.ok(m.meaning.length>6,'meaning for '+m.key);
 const report=ReflectionReport.build(state,{mode:'solo'});
 assert.ok(report);
 names.forEach((name,i)=>assert.ok(report.includes(name+'：'+Object.values(values)[i])));
 const svg=EndingCard.buildSvg({kind:'warning',scene:'neutral',title:'街の記録',metrics:detail.metrics});
 assert.deepEqual(EndingCard.labels,names);
 names.forEach(n=>assert.ok(svg.includes(n)));
 assert.match(svg,/目盛り 0–100/);
});
test('hidden half remains unavailable during decisions, labels are only final revealed content',()=>{
 const inProgress={...state,phase:'active',shadow:undefined,ending:null};
 assert.deepEqual(build(inProgress).metrics,[]);
 assert.equal(ReflectionReport.build(inProgress,{mode:'solo'}),null);
 const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
 for(const name of names.slice(0,3))assert.ok(html.includes('class="stat-label">'+name+'</span>'));
 for(const name of names.slice(3))assert.ok(!html.includes('class="stat-label">'+name+'</span>'));
 const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
 assert.match(app,/allMetricNames\[s\.ending\.metric\]/);
});
test('internal engine keys and values stay the original six, not text labels',()=>{
 const E=require('../engine.js');
 assert.deepEqual(Object.keys(E.INITIAL_PUBLIC),['prosperity','convenience','appeal']);
 assert.deepEqual(Object.keys(E.INITIAL_SHADOW),['trust','fairness','resilience']);
});
