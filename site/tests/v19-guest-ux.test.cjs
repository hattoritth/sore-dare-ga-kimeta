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

test('hidden values stay absent through the mandatory conference and appear only on completed results',()=>{
 const spotlight=html.match(/<section id="shadowSpotlight"[\s\S]*?<\/section>/)?.[0];
 assert.ok(spotlight);assert.match(spotlight,/hidden/);assert.match(spotlight,/見えていなかった3つの影響/);
 assert.match(app,/if\(pressDone&&endingMetricsCity!==s\.cityStartedAt\)/);
 assert.match(app,/pressData\.metrics\.filter\(x=>x\.group==='shadow'\)/);
 assert.match(app,/value\.textContent=String\(clamp\(metric\.value\)\)/);
 assert.match(app,/meaning\.textContent=metric\.meaning/);
 assert.match(app,/endingFlowStage=4;pressOpen=true;pressDone=false;pressIndex=-1/);
 assert.match(html,/id="pressConference" role="dialog" aria-modal="true"/);
 assert.match(app,/endingFlowStage=4;if\(state\)renderResult\(state\)/);
 assert.match(html,/summary>レーダーと6指標を詳しく見る/);
 assert.match(app,/\$\('metricComparison'\)\.open=false/);
 assert.match(html,/id="endingRadar"/);assert.match(html,/id="publicMetrics"/);assert.match(html,/id="shadowMetrics"/);
 assert.doesNotMatch(spotlight,/市への信頼\s*\d|公平さ\s*\d|未来への備え\s*\d/);
});

test('conference completion and skip both navigate directly to result and save screen',()=>{
 assert.match(app,/endingShowAll'\)\.addEventListener\('click',\(\)=>\{endingFlowStage=4/);
 assert.match(app,/pressSkip'\)\.onclick=\(\)=>\{[\s\S]*?endingFlowStage=4/);
 assert.match(app,/pressNext'\)\.onclick=\(\)=>\{[\s\S]*?endingFlowStage=4/);
 assert.match(app,/endingCardTools'\)\.hidden=!pressDone\|\|endingFlowStage<4/);
});

test('solo uses direct option IDs without clinic forms or a second confirmation step',()=>{
 assert.doesNotMatch(html,/confirmHumanClinic|cancelHumanClinic|clinicChoice|strategyChoice|clinicFollowup/);assert.doesNotMatch(app,/chooseSoloDetail|clinicResponse\(/);
 const Engine=require('../engine.js'),g=Engine.createGame(1000,{autostart:true,storyMode:'solo'});Engine.join(g,'solo','',1000);const option=Engine.publicState(g,'solo').episode.options[0];assert.equal(Engine.vote(g,'solo',option.id,g.roundEndsAt-1),true);assert.equal(g.public.prosperity,61);assert.equal(Object.keys(g.votes).length,1);assert.equal(Engine.advance(g,g.roundEndsAt),true);assert.equal(g.history[0].winningOption,option.id);
});

test('new city and replay clear previously revealed shadow values from the DOM',()=>{
 assert.match(app,/s\.phase!=='reveal'&&endingFlowCityStartedAt!==null&&s\.cityStartedAt!==endingFlowCityStartedAt/);
 assert.match(app,/function clearEndingResultDom\(\)/);
 assert.match(app,/for\(const id of \['endingCityPicture','endingCardPreview','endingCardPrint','endingRadar','publicMetrics','shadowMetrics','groupAccountabilityList','shadowSpotlightRows','historyList','pressScene'\]\)\$\(id\)\.replaceChildren\(\)/);
 assert.match(app,/for\(const id of \['endingProgress','endingTitle','endingText','endingKicker','endingIncident','pressQuestion','pressAnswer','pressOutcome','pressIssue','endingLetterText','endingCardStatus','reflectionStatus','decisionAccountability','resultNote'\]\)\$\(id\)\.textContent=''/);
 assert.match(app,/\$\('reflectionFallback'\)\.value='';\$\('reflectionFallback'\)\.hidden=true/);
 assert.match(app,/for\(const id of \['endingCardMore','metricComparison','decisionHistory'\]\)\$\(id\)\.open=false/);
 assert.match(app,/clearEndingResultDom\(\);endingFlowCityStartedAt=null/);
});

test('replay cancels in-flight conference frames and invalidates late typing callbacks',()=>{
 assert.match(app,/function clearEndingResultDom\(\)\{\s*\/\/[^\n]*\n\s*pressGeneration\+\+;/);
 assert.match(app,/if\(pressFrame\)\{cancelAnimationFrame\(pressFrame\);pressFrame=0;\}/);
 assert.match(app,/\$\('pressAnswer'\)\.hidden=true;\$\('pressQuestion'\)\.hidden=true/);
 assert.match(app,/function typePressLine\(line\)\{const target=\$\('pressAnswer'\),generation=\+\+pressGeneration/);
 assert.match(app,/if\(generation!==pressGeneration\)return/);
});

test('old five-step reveal controls stay hidden while conference is shown',()=>{
 assert.match(app,/endingShowAll'\)\.hidden=endingFlowStage>=3/);
 assert.match(app,/endingShowAll'\)\.hidden=endingFlowStage>=3/);
});

test('replay appears once beside save actions and is solo-only at the final stage',()=>{
 assert.equal((html.match(/id="replayButton"/g)||[]).length,1);
 const actions=html.match(/class="ending-card-actions"[\s\S]*?<\/div>/)?.[0];assert.match(actions,/id="replayButton"/);
 assert.match(app,/replayButton'\)\.hidden=endingFlowStage<4\|\|view!=='solo'/);
 assert.match(app,/replayButton'\)\.onclick=\(\)=>\{if\(view==='solo'\)\{clearEndingResultDom\(\);endingFlowCityStartedAt=null;startSolo\(\);\}\}/);
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

test('live choices expose no metric deltas and reveal all six values after the ending',()=>{
 assert.doesNotMatch(html,/humanImpact|aiImpact|impact-row|impact-chip/);assert.doesNotMatch(app,/impactPreview|renderImpact/);
 const Engine=require('../engine.js'),g=Engine.createGame(0,{autostart:true});Engine.join(g,'p','P',0);const live=Engine.publicState(g,'p');assert.deepEqual(live.public,{happiness:71});assert.equal(live.shadow,undefined);g.phase='reveal';const result=Engine.publicState(g,'p');assert.equal(Object.keys(result.public).length+Object.keys(result.shadow).length,6);
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
 assert.doesNotMatch(app,/window\.print\(\)/);assert.match(app,/pdfFromJpegDataUrl\(jpeg\)/);
 assert.match(app,/link\.download='sore-dare-ga-kimeta-result\.pdf'/);
 assert.match(css,/@media print/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);assert.equal(new Set(ids).size,ids.length,'static HTML ids must be unique');
});
