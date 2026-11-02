const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../public');

test('solo clinic decision asks for place and reason before the existing engine vote',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 for(const id of ['clinicChoice','humanClinicForm','aiClinicForm','confirmHumanClinic','acceptAiClinic'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(app,/母の通院は、今の診療所まで片道1時間/);
 assert.match(html,/総利用者数と仕事帰りの通いやすさ/);
 assert.match(html,/通院が難しい人への届きやすさ/);
 assert.match(app,/if\(soloGame\.round===0\)\{clinicPending=choice/);
 assert.match(app,/clinicPending=null;submitSoloVote\('human'\)/);
 assert.match(app,/clinicPending=null;submitSoloVote\('ai'\)/);
 assert.match(app,/MachiEngine\.vote\(soloGame,'solo',choice,Date\.now\(\)\)/);
 assert.match(html,/予測利用者数、交通の便、人口構成/);
 assert.match(html,/個々の通院事情が提案にどれだけ影響したかは、この場で説明しきれません/);
});

test('clinic aftermath requires a separate response and never changes score or group voting',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 for(const value of ['review','support','revise'])assert.match(html,new RegExp(`value="${value}"`));
 assert.match(app,/clinicFollowupPending=true/);
 assert.match(html,/対応を記録して続ける/);
 assert.match(app,/clinicRecordText\(\)/);
 assert.match(app,/これは物語上の記録で、街の指標や投票結果には加算されません/);
 assert.match(app,/\/api\/vote/);
 assert.doesNotMatch(app,/clinicRecord[^\n]{0,200}\/api\/vote/);
 assert.match(app,/判断を任せるとき、何を確認しておく必要があったでしょうか/);
});

test('clinic aftermath is outside the engine and shared mode retains its regular 23 second votes',()=>{
 const engine=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.equal(engine,fs.readFileSync(path.join(dir,'engine.js'),'utf8'));
 assert.match(engine,/ROUND_MS=23000/);
 assert.match(engine,/const SOLO_STORY=\[0,4,2,3\]/);
 assert.match(app,/if\(view==='group'\)\{/);
 assert.match(app,/request\('\/api\/vote'/);
 assert.match(app,/clinicFollowup\?\.response|clinicFollowupPending/);
});
