const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Card=require('../public/ending-card.js');
const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../public/style.css'),'utf8');
const metrics=Card.metricKeys.map((key,i)=>({key,label:Card.labels[i],value:30+i*10,group:i<3?'public':'shadow'}));

test('town snapshot is captured once per city and reset for replay',()=>{
 const cache=Card.createSceneSnapshotCache();let calls=0;
 const canvas={width:640,height:480,toDataURL(type){calls++;assert.equal(type,'image/png');return 'data:image/png;base64,iVBORw0KGgo=';}};
 assert.equal(cache.get('city-a',canvas),cache.get('city-a',canvas));assert.equal(calls,1);
 cache.get('city-b',canvas);assert.equal(calls,2);cache.clear();cache.get('city-b',canvas);assert.equal(calls,3);
});

test('tainted or unavailable canvas falls back without breaking ending rendering',()=>{
 const cache=Card.createSceneSnapshotCache();assert.equal(cache.get('bad',{width:1,height:1,toDataURL(){throw Error('tainted');}}),'');
 assert.equal(cache.get('empty',{width:0,height:0,toDataURL(){throw Error('must not run');}}),'');
 assert.match(Card.sceneVisual({kind:'true',scene:'true'}),/<svg/);
});

test('only validated local PNG data URIs are accepted',()=>{
 assert.equal(Card.validSceneImage('data:image/png;base64,iVBORw0KGgo='),'data:image/png;base64,iVBORw0KGgo=');
 for(const input of ['https://example.test/a.png','data:image/svg+xml,<svg/>','data:image/png;base64,AA!A','data:image/png;base64,'+'A'.repeat(12000001)])assert.equal(Card.validSceneImage(input),null);
});

test('six crisis visuals, TRUE, NORMAL, WARNING and undecided remain distinct and never label TRUE as NORMAL',()=>{
 for(const key of ['prosperity','convenience','appeal','trust','fairness','resilience'])assert.match(Card.sceneVisual({kind:'collapse',scene:key,sceneImage:'data:image/png;base64,iVBORw0KGgo='}),new RegExp(`data-theme="${key}"`));
 assert.match(Card.sceneVisual({kind:'true',scene:'true',sceneImage:'data:image/png;base64,iVBORw0KGgo='}),/data-theme="success"/);
 assert.match(Card.buildPreview({kind:'true',scene:'true',sceneImage:'data:image/png;base64,iVBORw0KGgo=',metrics}),/TRUE END/);
 assert.match(Card.buildPreview({kind:'stable',scene:'stable',sceneImage:'data:image/png;base64,iVBORw0KGgo=',metrics}),/健やかに続く街/);
 assert.match(Card.sceneVisual({kind:'warning',scene:'neutral',sceneImage:'data:image/png;base64,iVBORw0KGgo='}),/data-theme="caution"/);
 assert.match(Card.sceneVisual({kind:'undecided',scene:'neutral',sceneImage:'data:image/png;base64,iVBORw0KGgo='}),/data-theme="neutral"/);
});

test('stage four exposes radar with six metric values; earlier stages keep all hidden metrics out of markup and aria',()=>{
 assert.match(html,/id="endingRadar"/);assert.match(app,/if\(endingFlowStage>=3&&endingRadarCity!==s\.cityStartedAt\)\{endingRadarCity=s\.cityStartedAt;radar\.innerHTML=window\.EndingCard\.radarSvg/);
 assert.match(app,/if\(endingFlowStage<3\)\{if\(endingMetricsCity===s\.cityStartedAt\)/);
 assert.match(app,/if\(endingRadarCity===s\.cityStartedAt\)\{endingRadarCity=null;radar\.replaceChildren\(\);\}/);
 assert.match(app,/endingMetricsCity!==s\.cityStartedAt/);assert.match(app,/endingRadarCity!==s\.cityStartedAt/);
 assert.match(app,/endingFlowStage<1\)\{\$\('endingKicker'\)\.textContent='';\$\('endingTitle'\)\.textContent='';/);
 assert.match(Card.sceneVisual({kind:'true',scene:'true'}),/aria-hidden="true"/);
 assert.match(app,/if\(!endingSceneReady\)\{if\(scene\?\.render\)scene\.render\(0\)/);
 assert.match(app,/endingCardRenderCity!==s\.cityStartedAt/);
 assert.doesNotMatch(app,/この群の最高|この群の最低|群の最高|群の最低/);
 assert.match(css,/\.ending-inline-radar svg\{display:block;width:100%/);
});

test('saved preview and 1600x1100 card include the real town image, radar and all metric values',()=>{
 const data={kind:'true',scene:'true',sceneImage:'data:image/png;base64,iVBORw0KGgo=',title:'役割を確かめた街',description:'備えと対話を続ける。',endingLabel:'TRUE END',metrics};
 const preview=Card.buildPreview(data),svg=Card.buildSvg(data);
 assert.match(preview,/src="data:image\/png;base64,iVBORw0KGgo="/);assert.match(preview,/ending-preview-radar/);
 assert.match(svg,/width="1600" height="1100"/);assert.match(svg,/<image href="data:image\/png;base64,iVBORw0KGgo="/);
 assert.match(svg,/6指標/);for(const metric of metrics)assert.match(svg,new RegExp(`>${metric.value}<`));
 assert.match(app,/scene\.render\(0\)/);assert.match(app,/endingSceneCache\.clear\(\)/);
});
