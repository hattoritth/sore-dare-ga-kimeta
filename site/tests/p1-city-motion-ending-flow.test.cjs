const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const city=fs.readFileSync(path.join(__dirname,'../public/city-art.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');

test('ending reveal follows picture, title, reason, metrics, then save with deliberate next and all-at-once controls',()=>{
 assert.match(app,/endingFlowLabels=\['変わった街','結末','理由','6つの指標','保存'\]/);
 assert.match(app,/endingSceneCache\.get\(s\.cityStartedAt/);
 assert.match(app,/endingFlowStage=Math\.min\(4,endingFlowStage\+1\)/);
 assert.match(app,/endingFlowStage=3;if\(state\)renderResult\(state\)/);
 assert.match(app,/metricComparison'\)\.hidden=endingFlowStage<3/);
 assert.match(app,/endingCardTools'\)\.hidden=endingFlowStage<4/);
 assert.match(app,/pressConference'\)\.hidden=endingFlowStage<4\|\|!pressOpen/);
 assert.match(html,/id="endingNext"/);assert.match(html,/id="endingShowAll"/);
});

test('decision highlight uses resolved site mapping, skips deferred outcomes, and remains idempotent by event identity',()=>{
 assert.match(app,/decisionSiteForEvent=event=>window\.MachiEngine\.EPISODES\.find/);
 assert.match(app,/const id=decisionSiteForEvent\(event\),site=artModel\.site\(id\)/);
 assert.doesNotMatch(app,/soloOrder=/,'keep no duplicate solo episode map');
 for(const id of ['clinic','office','waterfront','energy','transit','parkA','school'])assert.match(app,new RegExp(`\\b${id}:`));
 assert.match(app,/event\.chosen!=='mixed'&&!event\.noVotes&&!event\.deferred/);
 assert.match(app,/s\.built\?\.\[id\]/);
 assert.match(app,/decisionKey!==highlightEventKey/);
 assert.match(app,/clearDecisionHighlight\(\)/);
 assert.match(city,/setDecisionHighlight\(id,label\)/);
 assert.match(city,/drawDecisionHighlight\(\)/);
 assert.match(city,/this\.project\(\[site\.cell\[0\]/);
 assert.match(city,/this\.drawWorld\(\);this\.drawServices\(\);this\.drawDecisionHighlight\(\)/);
 assert.match(city,/this\.reduced\?\.82/);
});

test('reduced motion keeps a static marker and result metrics are cleared before the metrics step',()=>{
 assert.match(city,/t=this\.reduced\?1/);
 assert.match(city,/!this\.reduced&&elapsed>850/);
 assert.match(app,/if\(endingFlowStage<3\)\{if\(endingMetricsCity===s\.cityStartedAt\)/);
 assert.match(app,/if\(endingRadarCity===s\.cityStartedAt\)\{endingRadarCity=null;radar\.replaceChildren\(\);\}/);
});

test('decision highlight remains readable at phone scale using CSS-pixel screen-space drawing',()=>{
 assert.match(city,/this\.project\(\[site\.cell\[0\]/);
 assert.match(city,/c\.setTransform\(this\.dpr,0,0,this\.dpr,0,0\)/);
 assert.match(city,/c\.font='800 15px/);
});

test('AI facility highlights name the built building, not the human alternative',()=>{
 for(const label of ['market','dc','floodgate','transit','mixed','solar','homes','school','clinic']){
  assert.match(app,new RegExp('\\b'+label+':'));
 }
 assert.match(app,/facilityLabels\[s\.built\[id\]\]/);
 assert.doesNotMatch(app,/office:'駅前の市場'/);
});
test('a five-stage ending does not leak scene title via screen reader and keeps optional conference accessible',()=>{
 assert.match(html,/id="endingCityPicture"[^>]*role="img"[^>]*aria-label="判断によって変化した街の風景"/);
 assert.match(app,/setAttribute\('aria-label','判断後の街の風景'\)/);
 assert.match(html,/id="openEndingPress"/);assert.match(html,/id="closeEndingPress"/);
 assert.match(app,/pressOpen=true;pressDone=false/);
 assert.match(app,/if\(endingFlowStage>=4&&endingCardRenderCity!==s\.cityStartedAt\)\{/);
});
