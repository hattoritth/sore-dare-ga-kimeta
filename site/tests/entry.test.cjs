const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const dir=path.join(__dirname,'../public');
test('landing offers solo and group while the display and every view use the official root QR',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),app=fs.readFileSync(path.join(dir,'app.js'),'utf8');assert.match(html,/id="openSolo"/);assert.match(html,/id="openShared"/);assert.match(html,/id="siteQrOpen"/);assert.match(html,/href="https:\/\/machi-no-tsuzuki-20261031\.tthkpba\.chatgpt\.site\/"/);assert.match(app,/window\.SITE_QR_DATA\|\|'\/site-qr\.svg'/);assert.doesNotMatch(html,/PoC|デモ|試作/);
});
test('actions render directly from the episode options without a second-level choice',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),app=fs.readFileSync(path.join(dir,'app.js'),'utf8');assert.match(html,/id="decisionOptions"/);assert.doesNotMatch(html,/data-vote="human"|data-vote="ai"|data-strategy|clinicChoice|clinicResponse/);assert.match(app,/for\(const option of e\.options\|\|\[\]\)/);assert.match(app,/button\.dataset\.vote=option\.id/);assert.match(app,/submitSoloVote\(choice\)/);assert.doesNotMatch(app,/impactPreview|renderImpact/);
});
test('shared entry keeps the explicit lobby and start action before the timer',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),app=fs.readFileSync(path.join(dir,'app.js'),'utf8');assert.match(html,/id="lobbyPanel"/);assert.match(html,/id="startShared"/);assert.match(app,/request\('\/api\/start'/);assert.match(app,/everJoined&&s\.phase==='lobby'/);
});
test('offline HTML is self-contained, runs solo and embeds its official site QR',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../../standalone/それ、誰が決めた？_街が動く版.html'),'utf8');assert.match(html,/id="siteQrOpen"/);assert.match(html,/data:image\/svg\+xml;charset=utf-8/);assert.match(html,/location\.protocol==='file:'/);assert.doesNotMatch(html,/<script src=|<link rel="stylesheet"/);assert.match(html,/https:\/\/machi-no-tsuzuki-20261031\.tthkpba\.chatgpt\.site\//);
});
test('Node and browser use exactly the same rules',()=>assert.equal(fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8'),fs.readFileSync(path.join(dir,'engine.js'),'utf8')));
test('prologue keeps visible typing activity and reduced-motion support',()=>{const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),css=fs.readFileSync(path.join(dir,'style.css'),'utf8');assert.match(html,/id="prologueActivity"/);assert.match(css,/prefers-reduced-motion:reduce/);});
test('one happiness score replaces the three public metric HUD',()=>{const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');assert.match(html,/data-stat="happiness"/);assert.doesNotMatch(html,/data-stat="prosperity"|data-stat="convenience"|data-stat="appeal"/);});
