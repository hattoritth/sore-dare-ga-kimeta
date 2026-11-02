const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../public');
test('landing offers solo and group and display QR points directly to shared participation',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(html,/id="openSolo"/);
 assert.match(html,/id="openShared"/);
 assert.match(html,/ひとりで遊ぶ/);
 assert.match(html,/みんなで遊ぶ/);
 assert.match(app,/const url=location\.origin\+'\/\?mode=group';/);
 for(const name of ['PoC','デモ','試作','テスト版']) assert.ok(!html.includes(name),`no dev word ${name}`);
});


test('dialogue presents decisions directly without an intermediary button',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.doesNotMatch(html,/選択肢を見る|id="dialogueSkip"/);
 assert.doesNotMatch(app,/dialogueOpen|dialogueSkip|dialogueAt/);
 assert.match(html,/id="decisionOptions"/);
 assert.match(html,/data-vote="human"/);
 assert.match(html,/data-vote="ai"/);
 assert.match(app,/show\('decisionOptions',true\)/);
});

test('each decision explains short- and long-term tradeoffs and the ending records agency',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 const engine=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
 assert.match(html,/id="humanTradeoff"/);assert.match(html,/id="aiTradeoff"/);
 assert.match(app,/今：\$\{e\.humanNow\}　その先：\$\{e\.humanLater\}/);
 assert.match(app,/今：\$\{e\.aiNow\}　その先：\$\{e\.aiLater\}/);
 assert.match(html,/決め方と責任/);assert.match(app,/AIに何を任せるか決めたのも、あなたの選択です/);
 const Engine=require('../engine.js');
 assert.equal(Engine.EPISODES.length,7);
 assert.ok(Engine.EPISODES.every(e=>e.humanNow&&e.humanLater&&e.aiNow&&e.aiLater));
 assert.doesNotMatch(engine,/humanNow:[^,]+,humanLater:[^,]+,aiNow:[^,]+,aiLater:[^,]+,impact:/);
});
test('shared entry provides an explicit lobby and start action before the round timer',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 const server=fs.readFileSync(path.join(__dirname,'../server.mjs'),'utf8');
 assert.match(html,/id="lobbyPanel"/);assert.match(html,/id="startShared"/);
 assert.match(app,/request\('\/api\/start'/);assert.match(app,/everJoined&&s\.phase==='lobby'/);
 assert.match(server,/p==='\/api\/start'/);
});

test('offline HTML is generated from the same assets and keeps a functional file-mode navigation',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../../standalone/それ、誰が決めた？_街が動く版.html'),'utf8');
 assert.match(html,/id="riskNotice"/);
 assert.match(html,/location\.protocol==='file:'/);
 assert.doesNotMatch(html,/<script src=|<link rel="stylesheet"/);
 assert.match(html,/window\.location\.assign\(location\.pathname\+q\)/);
});

test('Node and browser use exactly the same rules',()=>{
 assert.equal(fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8'),fs.readFileSync(path.join(dir,'engine.js'),'utf8'));
});


test('prologue keeps a visible typing activity indicator during the automatic pause',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(html,/id="prologueActivity"/);assert.match(html,/id="prologueActivityLabel"/);
 assert.match(css,/@keyframes typing-dot/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(app,/次のメッセージを入力中/);
 assert.match(app,/街への案内を準備中/);
 assert.match(app,/prologueIndex\+\+;renderPrologue\(\)/);
});

test('practice decision is a separate first-time interaction, not a consequential round',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
 for(const id of ['tutorialPanel','tutorialHuman','tutorialAi','tutorialChoices','tutorialFeedback','tutorialContinue','tutorialSkip'])assert.match(html,new RegExp('id="'+id+'"'));
 const practice=app.split(' function practice(choice){')[1]?.split(' function finishTutorial(')[0];
 assert.ok(practice,'practice callback exists');
 assert.doesNotMatch(practice,/MachiEngine\.(vote|advance)|\/api\/vote|\/api\/start/);
 assert.match(app,/if\(tutorialActive&&\(view==='solo'\|\|view==='group'\)\)/);
 assert.match(app,/startTutorial\(\);startSolo\(\)/);
 assert.match(app,/if\(view==='group'\)startTutorial\(\)/);
 assert.match(css,/\.tutorial-choice/);
 assert.match(html,/街の点数や本編の判断回数は変わりません/);
});

test('initial city draw has a moving placeholder until canvas renders',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(html,/id="cityLoading"/);
 assert.match(app,/scene\.render\(dt\)/);
 assert.match(app,/if\(pixel\[0\]\+pixel\[1\]\+pixel\[2\]>220\)show\('cityLoading',false\)/);
});
