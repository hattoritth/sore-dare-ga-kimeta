const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const city=fs.readFileSync(path.join(__dirname,'../public/city-art.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');

test('ending reveal follows picture, title, reason, metrics, then save with deliberate next and all-at-once controls',()=>{
 assert.match(app,/endingFlowLabels=\['変わった街','結末','理由','6つの指標','保存'\]/);
 assert.match(app,/sceneSvg\(sceneKey\)/);
 assert.match(app,/endingFlowStage=Math\.min\(4,endingFlowStage\+1\)/);
 assert.match(app,/endingFlowStage=4/);
 assert.match(app,/metricComparison'\)\.hidden=endingFlowStage<3/);
 assert.match(app,/endingCardTools'\)\.hidden=endingFlowStage<4/);
 assert.match(app,/pressConference'\)\.hidden=true/);
 assert.match(html,/id="endingNext"/);assert.match(html,/id="endingShowAll"/);
});

test('decision highlight uses resolved site mapping, skips deferred outcomes, and remains idempotent by event identity',()=>{
 assert.match(app,/groupOrder=\['clinic','office','waterfront','energy','transit','parkA','school'\]/);
 assert.match(app,/soloOrder=\['clinic','parkA','waterfront','energy'\]/);
 for(const id of ['clinic','office','waterfront','energy','transit','parkA','school'])assert.match(app,new RegExp(`\\b${id}:`));
 assert.match(app,/event\.chosen!=='mixed'&&!event\.noVotes&&!event\.deferred/);
 assert.match(app,/s\.built\?\.\[id\]/);
 assert.match(app,/decisionKey!==highlightEventKey/);
 assert.match(app,/clearDecisionHighlight\(\)/);
 assert.match(city,/setDecisionHighlight\(id,label\)/);
 assert.match(city,/drawDecisionHighlight\(\)/);
 assert.match(city,/this\.iso\(site\.cell\[0\]\+site\.w\*\.52,site\.cell\[1\]\+site\.d\*\.55\)/);
 assert.match(city,/this\.drawWorld\(\);this\.drawServices\(\);this\.drawDecisionHighlight\(\)/);
 assert.match(city,/this\.reduced\?0\.72/);
});

test('reduced motion keeps a static marker and result metrics are cleared before the metrics step',()=>{
 assert.match(city,/t=this\.reduced\?1/);
 assert.match(city,/elapsed>\(this\.reduced\?2200:850\)/);
 assert.match(app,/if\(endingFlowStage<3\)\{\$\('publicMetrics'\)\.replaceChildren\(\);\$\('shadowMetrics'\)\.replaceChildren\(\);\}/);
});
