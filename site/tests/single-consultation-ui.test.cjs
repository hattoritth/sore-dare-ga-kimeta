const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Engine=require('../engine.js'),dir=path.join(__dirname,'../public');
test('four direct, topic-specific options replace binary buttons and all metric previews',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(html,/id="decisionOptions"/);assert.doesNotMatch(html,/data-vote="human"|data-vote="ai"|impact-row|impact-chip|clinicChoice|strategyChoice/);
 assert.match(app,/for\(const option of e\.options\|\|\[\]\)/);assert.match(app,/button\.dataset\.vote=option\.id/);assert.doesNotMatch(app,/impactPreview|renderImpact|impact-chip/);
 for(let round=0;round<Engine.MAX_ROUNDS;round++){const g=Engine.createGame(0,{autostart:true});Engine.join(g,'p','参加者',0);g.round=round;const choices=Engine.publicState(g,'p').episode.options;assert.equal(choices.length,4);assert.equal(choices.filter(o=>o.id.endsWith('-ai')).length,1);assert.equal(new Set(choices.map(o=>o.label)).size,4);}
});
test('one happiness metric is the only active HUD and options are touch-sized',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),css=fs.readFileSync(path.join(dir,'style.css'),'utf8'),app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(html,/data-stat="happiness"/);assert.doesNotMatch(html,/data-stat="prosperity"|data-stat="convenience"|data-stat="appeal"/);assert.match(css,/\.decision\{min-height:64px/);assert.match(app,/s\.public\?\.happiness/);
});
