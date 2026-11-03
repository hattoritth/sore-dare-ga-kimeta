'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {build}=require('../public/reflection-report.js');
const metricState={public:{prosperity:61,convenience:52,appeal:43},shadow:{trust:34,fairness:25,resilience:16}};
function state(history,extra={}){return {phase:'reveal',ending:{kind:'warning',heading:'街は課題を残して続く。',description:'課題を確かめる判断が残りました。',risks:[{title:'格差の課題'}]},...metricState,history,...extra};}
test('active phase and incomplete reveal never produce report or hidden metric values',()=>{
 const hidden=state([]);hidden.phase='active';assert.equal(build(hidden),null);assert.equal(build({...state([]),shadow:{trust:1,fairness:2}}),null);assert.equal(build({...state([]),ending:null}),null);
});
test('solo report records four decisions and the actual clinic and strategy effects',()=>{
 const history=['human','ai','mixed','none'].map((chosen,i)=>({round:i+1,heading:`議題${i+1}`,chosen,result:`結果${i+1}`,human:1,ai:1}));
 const report=build(state(history),{mode:'solo',clinicRecord:{kind:'human',place:'suburb',reason:'access',response:'support'},humanPlans:[{round:1,strategy:'voices'}]});
 assert.ok(report);for(const text of ['郊外を選択','通院が難しい人への届きやすさ','先に通院を支援','選択の影響は、この展示内の街の指標に反映されています','現地の声を確かめる','第4回「議題4」','同数で保留','投票なしで保留'])assert.ok(report.includes(text),text);
 assert.match(report,/にぎわい：61/);assert.match(report,/未来への備え：16/);
});
test('group report includes seven collective tallies without individual attribution or identifiers',()=>{
 const history=Array.from({length:7},(_,i)=>({round:i+1,heading:`議題${i+1}`,chosen:i===2?'mixed':i===3?'none':'human',human:3,ai:2,result:'集計後の結果'}));
 const report=build(state(history),{mode:'group',clinicRecord:{kind:'human',place:'suburb'},humanPlans:[{round:1,strategy:'voices'}]});
 assert.match(report,/第7回「議題7」/);assert.match(report,/集団で人の方針が多数/);assert.match(report,/集団で同数となり実施保留/);assert.match(report,/投票なしで実施保留/);assert.match(report,/人の票 3、AIに委ねる票 2/);assert.match(report,/特定の個人が賛成・承認したとは示しません/);assert.doesNotMatch(report,/clinicRecord|humanPlans|cookie|token|秘密鍵|個人名/);
});
test('report uses actual ending context and never invents disasters or psychology',()=>{
 const report=build(state([{heading:'議題',chosen:'ai',result:'市場を整備'}]),{mode:'solo'});
 assert.match(report,/格差の課題/);assert.doesNotMatch(report,/豪雨|浸水|災害が発生|心理を推測/);
 assert.match(report,/個人の心理は推測していません/);
});
test('saved report names TRUE, NORMAL, WARNING and BAD ending classes',()=>{
 for(const [kind,label] of [['true','TRUE END'],['stable','NORMAL END'],['warning','WARNING END'],['collapse','BAD END']]){
  const report=build(state([{chosen:'human'}],{ending:{kind,heading:'街の結末',description:'説明',risks:[]}}));
  assert.match(report,new RegExp(`結末（${label}）：街の結末`));
 }
});
test('build is deterministic for identical input',()=>{const input=state([{heading:'議題',chosen:'none',result:'保留'}]);assert.equal(build(input,{mode:'group'}),build(input,{mode:'group'}));});
