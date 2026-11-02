const test=require('node:test');
const assert=require('node:assert/strict');
const DecisionUX=require('../public/decision-ux.js');
const Conference=require('../public/conference.js');

test('solo human strategy is a browser-only presentation record, never a vote value',()=>{
 for(const strategy of ['voices','balance']){
  const plan=DecisionUX.record(2,strategy);
  assert.deepEqual(plan,{round:2,strategy});
  assert.equal(DecisionUX.explanation(plan).includes('追加効果を示すものではありません'),true);
  assert.equal(DecisionUX.explanation(plan).includes('再読み込みで失われます'),true);
 }
 assert.equal(DecisionUX.record(1,'voices'),null);
 assert.equal(DecisionUX.record(5,'voices'),null);
 assert.equal(DecisionUX.record(2,'unknown'),null);
});

test('human strategy has no scoring hook and only the selected stance appears in conference',()=>{
 const state={ending:{kind:'stable'},public:{},shadow:{},history:[
  {round:2,heading:'交通',chosen:'human',result:'交通の判断が記録されました。'},
  {round:3,heading:'海辺',chosen:'human',result:'海辺の判断が記録されました。'}
 ]};
 const conference=Conference.build(state,null,[DecisionUX.record(2,'voices'),DecisionUX.record(3,'balance')]);
 assert.match(conference.answers[0],/現地の声を確かめる方針が選ばれました/);
 assert.match(conference.answers[1],/複数地区の希望を調整する方針が選ばれました/);
 assert.match(conference.answers[0],/実際の行動や追加効果を示すものではありません/);
 assert.equal(DecisionUX.record(2,'voices').score,undefined);
});

test('human strategy options stay separate from binary shared vote values',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/index.html'),'utf8');
 assert.match(html,/data-vote="human"/);assert.match(html,/data-vote="ai"/);
 assert.match(html,/data-strategy="voices"/);assert.match(html,/data-strategy="balance"/);
 assert.equal((html.match(/data-vote=/g)||[]).length,2);
});

test('intro and practice distinguish the three roles while preserving cast and first clinic branch',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/index.html'),'utf8');
 const app=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
 for(const role of ['市長 · あなた','住民','まちづくり支援AI · 委任先'])assert.ok(html.includes(role));
 for(const name of ['ヒカリ','ソラ','ナギ','ミドリ'])assert.ok(app.includes(name));
 assert.match(html,/class="resident-label">影響を受ける人/);
 assert.match(app,/if\(soloGame\.round===0\)\{clinicPending=choice/);
 assert.match(app,/AIは予測利用者数/);
});

test('exhibition workload cue uses no fabricated queue count or timed penalty and honors reduced motion',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/index.html'),'utf8');
 const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/style.css'),'utf8');
 assert.match(html,/展示上の情景 · 相談や依頼が重なる街/);
 assert.match(html,/スキップする/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(html,/未処理\s*\d+件|残り\s*\d+秒/);
});
