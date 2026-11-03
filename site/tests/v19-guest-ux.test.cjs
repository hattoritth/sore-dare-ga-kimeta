'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
const reflection=require('../public/reflection-report.js');

test('hidden values stay absent until stage 4/5, which reveals all three real shadow values before save',()=>{
 const spotlight=html.match(/<section id="shadowSpotlight"[\s\S]*?<\/section>/)?.[0];
 assert.ok(spotlight);assert.match(spotlight,/hidden/);assert.match(spotlight,/見えていなかった3つの影響/);
 assert.match(app,/if\(endingFlowStage>=3&&endingMetricsCity!==s\.cityStartedAt\)/);
 assert.match(app,/pressData\.metrics\.filter\(x=>x\.group==='shadow'\)/);
 assert.match(app,/value\.textContent=String\(clamp\(metric\.value\)\)/);
 assert.match(app,/meaning\.textContent=metric\.meaning/);
 assert.match(app,/\$\('endingText'\)\.hidden=endingFlowStage<2\|\|endingFlowStage===3/);
 assert.match(app,/show\('endingIncident',endingFlowStage>=3/);
 assert.match(app,/endingFlowStage>=3\?\(s\.incident\?/);
 assert.match(app,/shadowSpotlight'\)\.hidden=endingFlowStage!==3/);
 assert.match(app,/endingNext'\)\.textContent=\['結末を見る','理由を見る','指標を見る','保存へ進む','保存する'\]/);
 assert.match(html,/summary>レーダーと6指標を詳しく見る/);
 assert.match(app,/\$\('metricComparison'\)\.open=false/);
 assert.match(html,/id="endingRadar"/);assert.match(html,/id="publicMetrics"/);assert.match(html,/id="shadowMetrics"/);
 assert.doesNotMatch(spotlight,/市への信頼\s*\d|公平さ\s*\d|未来への備え\s*\d/);
});

test('show all routes to the reveal screen and requires a second action to save',()=>{
 assert.match(app,/endingShowAll'\)\.addEventListener\('click',\(\)=>\{endingFlowStage=3/);
 assert.match(app,/endingNext'\)\.addEventListener\('click',\(\)=>\{endingFlowStage=Math\.min\(4,endingFlowStage\+1\)/);
 assert.match(app,/endingCardTools'\)\.hidden=endingFlowStage<4/);
});

test('clinic form has a noncommitting return and keeps confirm and return together',()=>{
 assert.match(html,/id="confirmHumanClinic"/);assert.match(html,/id="cancelHumanClinic"[^>]*>選択に戻る/);
 assert.ok(app.includes("$('cancelHumanClinic').onclick=()=>{if(clinicPending!=='human'||view!=='solo')return;clinicPending=null;show('clinicChoice',false);show('decisionOptions',true);$('humanDecision').focus();}"));
 assert.match(css,/\.clinic-form-actions\{display:grid;grid-template-columns/);
 assert.match(css,/\.clinic-form-actions button\{min-height:48px/);
 assert.match(app,/if\(!soloGame\|\|soloGame\.phase!=='active'\|\|soloGame\.votes\.solo\)return/);
 const Engine=require('../engine.js');
 const game=Engine.createGame(1000,{autostart:true,storyMode:'solo'});Engine.join(game,'solo','',1000);const before={...game.public};
 assert.equal(game.votes.solo,undefined);assert.deepEqual(game.public,before);
 assert.equal(Engine.vote(game,'solo','ai',game.roundEndsAt-1),true);assert.deepEqual(game.public,before);
 assert.equal(Object.keys(game.votes).length,1);
 assert.equal(Engine.advance(game,game.roundEndsAt),true);assert.equal(game.history.length,1);
});

test('new city and replay clear previously revealed shadow values from the DOM',()=>{
 assert.match(app,/s\.phase!=='reveal'&&endingFlowCityStartedAt!==null&&s\.cityStartedAt!==endingFlowCityStartedAt/);
 assert.match(app,/shadowSpotlightRows'\)\.replaceChildren\(\);\$\('shadowSpotlight'\)\.hidden=true/);
 assert.match(app,/shadowMetrics'\)\.replaceChildren\(\);\$\('publicMetrics'\)\.replaceChildren\(\);\$\('endingRadar'\)\.replaceChildren\(\)/);
});

test('skip-to-full-results is hidden once stage 4 reveal is already visible',()=>{
 assert.match(app,/endingShowAll'\)\.hidden=endingFlowStage>=3/);
 assert.match(app,/endingShowAll'\)\.addEventListener\('click',\(\)=>\{endingFlowStage=3/);
});

test('replay appears once beside save actions and is solo-only at the final stage',()=>{
 assert.equal((html.match(/id="replayButton"/g)||[]).length,1);
 const actions=html.match(/class="ending-card-actions"[\s\S]*?<\/div>/)?.[0];assert.match(actions,/id="replayButton"/);
 assert.match(app,/replayButton'\)\.hidden=endingFlowStage<4\|\|view!=='solo'/);
 assert.match(app,/replayButton'\)\.onclick=\(\)=>\{if\(view==='solo'\)startSolo\(\);\}/);
});

test('mode cards disclose decision counts and pace, with full-width mobile tap targets',()=>{
 assert.match(html,/ひとりで遊ぶ<\/strong><span>4つの判断・自分のペース/);
 assert.match(html,/みんなで遊ぶ<\/strong><span>7つの判断・1問23秒/);
 assert.match(css,/\.landing-actions \.mode-card\{width:100%;min-width:0;min-height:88px/);
});

test('unjoined group preview gets neutral ticker while reveal and participant scenes keep their real ticker',()=>{
 assert.match(app,/view==='group'&&!s\.isParticipant&&s\.phase!=='reveal'\?\(s\.phase==='lobby'\?'参加受付中/);
 assert.match(app,/s\.phase==='waiting'\?'次の街を準備しています。'/);
 assert.match(app,/最後の議題が進行中です。今回は結末を見届け、次の街から参加できます。/);
 assert.match(app,/この街は進行中。次の議題から参加できます。/);
 assert.match(app,/s\.phase==='reveal'\?'すべての決定には、続きがある。'/);
 assert.match(app,/s\.alert\?'【街の異変】'/);
});

test('AI and human decisions both show the same public-only three metric preview',()=>{
 assert.match(html,/id="humanImpact"/);assert.match(html,/id="aiImpact"/);
 assert.doesNotMatch(html.match(/id="aiDecision"[\s\S]*?<\/button>/)?.[0]||'',/hidden|aria-hidden/);
 assert.match(app,/renderImpact\('humanImpact',e\.impactPreview\?\.human\)/);
 assert.match(app,/renderImpact\('aiImpact',e\.impactPreview\?\.ai\)/);
 assert.match(app,/const impactNames=\{prosperity:'にぎわい',convenience:'便利さ',appeal:'住み心地'\}/);
 assert.doesNotMatch(app.match(/function renderImpact[\s\S]*?function renderQuestion/)?.[0]||'',/trust|fairness|resilience/);
});

test('BAD reflection names the actual prosperity outcome and limits causal claims to recorded evidence',()=>{
 const text=reflection.normalReflection({ending:{kind:'collapse',metric:'prosperity'},history:['human','human','human','human'].map(chosen=>({chosen}))},null,[]);
 assert.match(text,/にぎわいが0/);assert.match(text,/4回とも人の案/);
 const groupReflection=reflection.normalReflection({ending:{kind:'collapse',metric:'prosperity'},roundTotal:7,history:Array.from({length:7},()=>({chosen:'human'}))},null,[]);assert.match(groupReflection,/7回とも人の案/);assert.doesNotMatch(groupReflection,/4回とも/);assert.match(text,/予測利用者数や企業需要/);assert.match(text,/各選択の寄与まではこの記録から切り分けられません/);
 assert.doesNotMatch(text,/これが原因|必ず|確実に/);
 for(const [kind,history] of [['true',['human','human','human','ai']],['stable',['human','ai','human','ai']],['collapse',['human','human','human','human']]]){
  const result=reflection.normalReflection({ending:{kind,metric:'prosperity'},roundTotal:4,history:history.map(chosen=>({chosen}))},null,[]);
  assert.ok(result);if(kind==='true')assert.match(result,/人とAIに異なる役割/);if(kind==='stable')assert.doesNotMatch(result,/TRUE|正解/);
 }
});

test('shared seven round, print card, PNG/PDF, radar and full metrics remain present',()=>{
 const Engine=require('../engine.js');assert.equal(Engine.EPISODES.length,7);
 for(const id of ['downloadEndingPng','printEndingCard','endingCardPrint','endingCardMore','endingRadar','publicMetrics','shadowMetrics'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(app,/window\.print\(\)/);assert.match(css,/@media print/);
 assert.match(css,/#endingCardPrint svg\{display:block!important/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);assert.equal(new Set(ids).size,ids.length,'static HTML ids must be unique');
});
