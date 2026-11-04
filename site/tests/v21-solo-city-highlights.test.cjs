const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const engine=require('../engine.js');
const source=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const match=source.match(/const decisionSiteForEvent=event=>([^;]+);/);
assert.ok(match,'city highlight should use authoritative episode site');
const siteFor=vm.runInNewContext('event=>'+match[1],{window:{MachiEngine:engine}});
test('all seven decision highlights use their actual engine episode site',()=>{
 for(const ep of engine.EPISODES)assert.equal(siteFor({heading:ep.heading}),ep.site);
});
test('second solo decision highlights transit instead of the previously hard-coded parkA',()=>{
 const game=engine.createGame(1000,{autostart:true,storyMode:'solo'});
 engine.join(game,'solo','test',1000);
 assert.ok(engine.vote(game,'solo','ai',1001));
 engine.advance(game,game.roundEndsAt+1);
 const episode=engine.publicState(game,'solo').episode;
 assert.equal(episode.site,'transit');
 assert.ok(engine.vote(game,'solo','ai',game.roundStartedAt+1));
 engine.advance(game,game.roundEndsAt+1);
 assert.equal(game.built.transit,'market');
 assert.equal(siteFor(game.lastEvent),'transit');
 assert.match(source,/setDecisionHighlight\(id,facilityLabels\[s\.built\[id\]\]/);
});
test('unrecognized events do not produce a wrong highlight',()=>{
 assert.equal(siteFor({heading:'不存在'}),undefined);
 assert.equal(siteFor(null),undefined);
});
