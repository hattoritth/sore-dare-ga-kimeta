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

test('landing identifies the mayor, human department heads and one city AI without a role-card wall',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/index.html'),'utf8');
 const app=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
 assert.match(html,/市長として部長たちの相談を受け、一つの街づくりAIにも判断を委ねられます/);
 assert.doesNotMatch(html,/class="role-key/);
 for(const name of ['早川ひかり','三浦蒼太','高瀬 凪','森田みどり','保健福祉部長','都市整備部長','建設部長','環境政策部長'])assert.ok(app.includes(name));
 assert.doesNotMatch(html+app,/支援AI|まちづくり支援AI|街づくりAI · 4人の助言者|街づくりAI · (暮らし|都市計画|施設整備|環境)/);
 assert.match(html,/class="resident-label" id="residentLabel">相談・情報提供の出どころ/);
 assert.match(html,/strong>AIに任せる</);
 assert.match(app,/住民から届いた「母の通院に片道1時間かかる」という相談/);
 assert.doesNotMatch(app,/ヒカリ「住民から|母の通院には片道1時間/);
 assert.match(app,/if\(soloGame\.round===0&&choice==='human'\)/);
 assert.match(html,/ひとつの診療所を、どこへ/);
 assert.match(app,/\$\('questionTitle'\)\.textContent=e\.heading/);
 assert.match(app,/\$\('residentLabel'\)\.textContent=sources\[e\.site\]/);
});

test('all seven sites open with concise mayor-facing staff dialogue and factual source labels',()=>{
 const app=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
 const match=app.match(/const staffSpeeches=\{([^}]+)\}/);
 assert.ok(match,'site dialogue map exists');
 const entries=[...match[1].matchAll(/(clinic|office|waterfront|energy|transit|parkA|school):'([^']+)'/g)];
 assert.deepEqual(entries.map(x=>x[1]),['clinic','office','waterfront','energy','transit','parkA','school']);
 for(const [,site,line] of entries){
  assert.ok(line.startsWith('市長、'),site);
  assert.ok([...line].length<=60,site+' stays concise');
  assert.ok((line.match(/[。？]/g)||[]).length<=2,site+' uses at most two short sentences');
  assert.match(line,/相談|話|声|提案|方針/);
 }
 assert.match(app,/\$\('residentLabel'\)\.textContent=sources\[e\.site\]/);
 assert.match(app,/\$\('questionTitle'\)\.textContent=e\.heading;\$\('questionHint'\)\.textContent=e\.hint/);
 assert.match(app,/\$\('agentLine'\)\.textContent=staffSpeeches\[e\.site\]/);
 assert.doesNotMatch(app,/市長が人の判断を選びました|市長の委任を受け、街づくりAIが選びました/);
});

test('landing and decision surface keep role and workload explanations concise and honor reduced motion',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/index.html'),'utf8');
 const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/style.css'),'utf8');
 assert.doesNotMatch(html,/class="role-key|workload-note|相談や依頼が重なる街/);
 assert.match(html,/街へ進む／スキップ/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const app=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
 assert.match(app,/const prologueTimes=\[1300,1500,1700,1300\]/);
 assert.match(app,/elapsed\/24/);
 assert.match(app,/characters\.length\*24\+500/);
});


test('ending card covers six risk scenes, success and qualified neutral with all six real metrics',()=>{
 const card=require('../public/ending-card.js');
 const keys=['prosperity','convenience','appeal','trust','fairness','resilience'];
 for(const key of keys)assert.ok(card.scenes[key],key+' scene exists');
 assert.ok(card.scenes.stable);assert.ok(card.scenes.neutral);
 const values=[91,82,73,64,55,46],metrics=keys.map((key,i)=>({key,value:values[i]}));
 for(const key of keys){const svg=card.buildSvg({kind:'collapse',metric:key,scene:key,endingLabel:card.scenes[key].label,metrics});assert.ok(svg.includes('>'+card.scenes[key].label+'</text>'),key+' label appears');}
 const neutral=card.buildSvg({kind:'warning',scene:'neutral',metrics});assert.match(neutral,/課題の残る街/);assert.doesNotMatch(neutral,/健やかに続く街/);
 const undecided=card.buildSvg({kind:'undecided',scene:'neutral',metrics});assert.match(undecided,/課題の残る街/);
 const stable=card.buildSvg({kind:'stable',scene:'stable',metrics});assert.match(stable,/健やかに続く街/);
 for(const value of values)assert.ok(stable.includes('>'+value+'</text>'));
});

test('standalone ending card has no external resource references and decision confirmation uses real event text',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const card=fs.readFileSync(path.join(__dirname,'../public/ending-card.js'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
 assert.doesNotMatch(card,/https?:\/\/(?!www\.w3\.org)/);
 assert.match(app,/cityBeatHeading'\)\.textContent=event\.result/);
 assert.match(app,/card\.hidden=!pressDone/);
 assert.match(app,/classList\.add\('is-confirmed'\)/);
 assert.match(fs.readFileSync(path.join(__dirname,'../public/style.css'),'utf8'),/prefers-reduced-motion:reduce[^}]*\.vote-feedback\.is-confirmed/);
});
