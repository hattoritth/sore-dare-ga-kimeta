const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Engine=require('../engine.js'),dir=path.join(__dirname,'../public');
test('each of seven topics offers three concrete human actions and one AI delegation',()=>{
 for(let round=0;round<Engine.MAX_ROUNDS;round++){const g=Engine.createGame(0,{autostart:true});Engine.join(g,'p','参加者',0);g.round=round;const opts=Engine.publicState(g,'p').episode.options;assert.equal(opts.length,4);assert.equal(opts.filter(x=>x.id.endsWith('-ai')).length,1);assert.equal(new Set(opts.map(x=>x.label)).size,4);assert.ok(opts.every(x=>x.label.length>=8));}
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');assert.match(app,/button\.dataset\.vote=option\.id/);assert.doesNotMatch(app,/data-strategy|clinicChoice|impactPreview/);
});
test('topic-specific Japanese copy covers all seven group agendas and the four solo episode subset',()=>{
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8'),engine=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');for(const topic of ['診療所','駅前','海辺','電力','交通','公園','学び'])assert.ok(engine.includes(topic));
 const solo=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(solo,'p','参加者',0);for(let round=0;round<4;round++){solo.round=round;assert.equal(Engine.publicState(solo,'p').episode.options.length,4);}
});
test('landing and decision experience keep the mayor, staff roles, and one shared city clear',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),app=fs.readFileSync(path.join(dir,'app.js'),'utf8');assert.match(html,/この街の市長は、あなたです。/);assert.match(html,/id="openSolo"/);assert.match(html,/id="openShared"/);assert.match(app,/\$\('agentLine'\)\.textContent=e\.heading/);assert.match(html,/id="cityBeatActor"/);assert.doesNotMatch(html+app,/clinicChoice|clinicResponse|strategyChoice|impactPreview/);
});
test('static QR access is present on all views and standalone uses an embedded QR image',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),app=fs.readFileSync(path.join(dir,'app.js'),'utf8'),build=fs.readFileSync(path.join(__dirname,'../scripts/build-standalone.mjs'),'utf8');assert.match(html,/id="siteQrOpen"/);assert.match(html,/id="siteQrPanel"/);assert.match(html,/https:\/\/machi-no-tsuzuki-20261031\.tthkpba\.chatgpt\.site\//);assert.match(app,/setupQR\(\)/);assert.match(build,/data:image\/svg\+xml/);assert.doesNotMatch(app,/api\/qr\.svg/);
});
