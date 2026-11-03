const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../public');

test('solo first AI choice submits immediately while human clinic still needs place and reason',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 for(const id of ['clinicChoice','humanClinicForm','confirmHumanClinic'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/総利用者数と仕事帰りの通いやすさ/);assert.match(html,/通院が難しい人への届きやすさ/);
 assert.match(app,/if\(soloGame\.round===0&&choice==='human'\)/);
 assert.match(app,/if\(soloGame\.round===0&&choice==='ai'\)\{clinicRecord=\{kind:'ai',place:'station',reason:'forecast'\};clinicPending=null;submitSoloVote\('ai'\);return;\}/);
 assert.match(app,/clinicPending=null;submitSoloVote\('human'\)/);
 assert.match(app,/MachiEngine\.vote\(soloGame,'solo',choice,Date\.now\(\)\)/);
 assert.match(app,/storyBeatUntil=needsResponse\?Number\.MAX_SAFE_INTEGER:Date\.now\(\)\+/);assert.match(app,/const needsResponse=!!clinic&&clinic\.kind==='human'/);assert.match(app,/MachiEngine\.advance\(soloGame,Date\.now\(\)\)/);assert.match(app,/if\(endedBeat\)clearCityBeat\(\)/);
 assert.doesNotMatch(html,/acceptAiClinic/);assert.doesNotMatch(app,/acceptAiClinic/);
});

test('clinic aftermath is optional for AI, required for human, and outside scores/group voting',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 for(const value of ['review','support','revise'])assert.match(html,new RegExp(`value="${value}"`));
 assert.match(app,/show\('clinicFollowup',needsResponse\)/);assert.match(app,/clinicFollowupPending=true/);
 assert.match(html,/対応を記録して続ける/);assert.match(app,/clinicRecordText\(\)/);
 assert.match(app,/これは物語上の記録で、街の指標や投票結果には加算されません/);
 assert.match(app,/\/api\/vote/);assert.match(app,/request\('\/api\/vote'/);
});

test('clinic story changes no engine behavior and shared votes retain their 23 second rules',()=>{
 const engine=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.equal(engine,fs.readFileSync(path.join(dir,'engine.js'),'utf8'));assert.match(engine,/ROUND_MS=23000/);assert.match(engine,/const SOLO_STORY=\[0,4,2,3\]/);
 assert.match(app,/if\(view==='group'\)\{/);assert.match(app,/request\('\/api\/vote'/);
});
