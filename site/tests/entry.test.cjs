const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../public');
test('landing offers solo and group and display QR points to the mode chooser',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(html,/id="openSolo"/);
 assert.match(html,/id="openShared"/);
 assert.match(html,/ひとりで遊ぶ/);
 assert.match(html,/みんなで遊ぶ/);
 assert.match(app,/const url=location\.origin\+'\/';/);
 assert.doesNotMatch(app,/const url=location\.origin\+'\/\?mode=group';/);
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
