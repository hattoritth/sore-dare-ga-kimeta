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
 assert.doesNotMatch(html,/mode-card-index|mode-card-arrow|01 \/ YOUR CITY|02 \/ OUR CITY/);
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

test('human choices explain their tradeoffs while the AI action stays one tap and ending records agency',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 const engine=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
 assert.match(html,/id="humanTradeoff"/);assert.match(html,/id="aiTradeoff"/);assert.match(html,/<strong>AIに任せる<\/strong>/);
 assert.match(app,/s\.round===0\?'場所と理由を選ぶ'/);assert.match(app,/e\.humanNow,e\.humanLater/);
 assert.doesNotMatch(app,/今：\$\{e\.aiNow\}/);
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

test('solo opens its first real decision and group goes directly to join or lobby without a practice gate',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
 assert.doesNotMatch(html+app+css,/tutorial|practice|練習|チュートリアル/i);
 assert.match(app,/else if\(view==='solo'\)\{startSolo\(\);\}/);
 assert.match(app,/function startSolo\(\)[^]*?MachiEngine\.createGame\([^]*?render\(MachiEngine\.publicState/);
 assert.match(app,/else \{setupQR\(\);fetchState\(\);/);
 assert.match(app,/show\('joinPanel',!everJoined&&s\.phase!=='reveal'\)/);
 assert.match(app,/show\('lobbyPanel',everJoined&&s\.phase==='lobby'\)/);
 assert.match(html,/id="questionPanel"/);
 assert.match(html,/id="joinPanel"/);
 assert.match(html,/id="lobbyPanel"/);
});

test('initial city draw has a moving placeholder until canvas renders',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(html,/id="cityLoading"/);
 assert.match(app,/scene\.render\(dt\)/);
 assert.match(app,/if\(pixel\[0\]\+pixel\[1\]\+pixel\[2\]>220\)show\('cityLoading',false\)/);
});

const nodeTest=require('node:test'); const nodeAssert=require('node:assert/strict'); const nodeFs=require('node:fs'); const nodePath=require('node:path');
nodeTest('shared comparison render target exists before question rendering',()=>{const html=nodeFs.readFileSync(nodePath.join(__dirname,'../public/index.html'),'utf8');const app=nodeFs.readFileSync(nodePath.join(__dirname,'../public/app.js'),'utf8');nodeAssert.match(html,/id="groupPreviousResult"/);nodeAssert.match(app,/\$\('groupPreviousResult'\)/);});

test('vote buttons have concise actions without redundant option numbers or arrows',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 const human=html.match(/<button[^>]+id="humanDecision"[^>]*>[\s\S]*?<\/button>/)?.[0];
 const ai=html.match(/<button[^>]+id="aiDecision"[^>]*>[\s\S]*?<\/button>/)?.[0];
 assert.ok(human&&ai);
 for(const button of [human,ai]){assert.doesNotMatch(button,/decision-small|option-arrow|>01\b|>02\b/);}
 assert.match(human,/<strong id="humanText">自分で決める<\/strong>/);
 assert.match(ai,/<strong>AIに任せる<\/strong>/);
 assert.match(ai,/id="aiTradeoff"[^>]*/);
 assert.match(html,/id="impactNote" hidden/);
 assert.match(app,/view==='solo'\?'自分で決める':'人の案に投票する'/);
 assert.match(app,/renderImpact\('humanImpact',e\.impactPreview\?\.human\)/);
 assert.match(app,/e\.aiNow,e\.aiLater/);
});

test('offline mode keeps group choice visible and routes to published online play without pretending to host a group',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(html,/id="openShared"/);
 assert.match(html,/id="standaloneGroupNote" hidden/);
 assert.match(html,/最新改修は未反映/);
 assert.doesNotMatch(app,/show\('openShared',false\)/);
 assert.match(app,/show\('standaloneGroupNote',true\)/);
 assert.match(app,/location\.protocol==='file:'\?window\.location\.assign\('https:\/\/machi-no-tsuzuki-20261031\.tthkpba\.chatgpt\.site\/\?mode=group'\)/);
 assert.match(app,/goto\('\/\?mode=group'\)/);
});
