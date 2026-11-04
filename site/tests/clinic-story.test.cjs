const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Engine=require('../engine.js'),dir=path.join(__dirname,'../public');
test('clinic episode presents four direct actions and removes the former multi-step form',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),app=fs.readFileSync(path.join(dir,'app.js'),'utf8'),engine=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
 const game=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(game,'viewer','参加者',0);const actions=Engine.publicState(game,'viewer').episode.options;assert.equal(actions.length,4);assert.ok(actions.every(a=>a.label.length>=10&&engine.includes(a.label)));assert.equal(actions.filter(a=>a.id.endsWith('-ai')).length,1);
 assert.doesNotMatch(html,/clinicChoice|clinicPlace|clinicReason|clinicFollowup|data-strategy/);assert.doesNotMatch(app,/chooseSoloDetail|clinicResponse\(/);
 const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'p','参加者',0);assert.equal(Engine.publicState(g,'p').episode.options.length,4);
});
test('solo and shared modes use direct action IDs with distinct topic-specific model effects',()=>{
 const g=Engine.createGame(0,{autostart:true,storyMode:'solo'});Engine.join(g,'p','参加者',0);const opts=Engine.publicState(g,'p').episode.options;assert.equal(new Set(opts.map(o=>o.label)).size,4);
 const before={...g.public,...g.shadow};Engine.vote(g,'p',opts[2].id,1);Engine.advance(g,g.roundEndsAt);assert.notDeepEqual({...g.public,...g.shadow},before);assert.equal(g.history[0].winningOption,opts[2].id);
 const e=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');assert.equal(e,fs.readFileSync(path.join(dir,'engine.js'),'utf8'));
});
test('no clinic location or follow-up choices remain on city beat',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(html,/cityBeatHeading/);assert.match(html,/cityBeatVoice/);assert.doesNotMatch(html,/clinicFollowup|clinicResidentQuestion|clinicResponse/);assert.match(app,/cityBeatHeading'\)\.textContent=event\.result/);assert.match(app,/renderCityBeatDeltas\(game\)/);
});
