const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../public');

test('solo first AI choice submits immediately while human clinic still needs place and reason',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 for(const id of ['clinicChoice','humanClinicForm','confirmHumanClinic'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/多くの人の使いやすさ/);assert.match(html,/通院が難しい人への届きやすさ/);
 assert.match(app,/if\(soloGame\.round===0&&choice==='human'\)/);
 assert.match(app,/if\(soloGame\.round===0&&choice==='ai'\)\{clinicRecord=\{kind:'ai',place:'station',reason:'forecast'\};clinicPending=null;submitSoloVote\('ai'\);return;\}/);
 assert.match(app,/chooseSoloDetail\(soloGame,'solo',\{kind:'clinic',place:clinicRecord\.place,reason:clinicRecord\.reason\}\)/);
 assert.match(app,/clinicPending=null;submitSoloVote\('human'\)/);
 assert.match(app,/MachiEngine\.vote\(soloGame,'solo',choice,Date\.now\(\)\)/);
 assert.match(app,/storyBeatUntil=needsResponse\?Number\.MAX_SAFE_INTEGER:Date\.now\(\)\+/);assert.match(app,/const needsResponse=!!clinic&&clinic\.kind==='human'/);assert.match(app,/MachiEngine\.advance\(soloGame,Date\.now\(\)\)/);assert.match(app,/if\(endedBeat\)clearCityBeat\(\)/);
 assert.doesNotMatch(html,/acceptAiClinic/);assert.doesNotMatch(app,/acceptAiClinic/);
});

test('clinic aftermath changes solo city metrics after initial resolve; AI remains one tap',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 for(const value of ['review','support','revise'])assert.match(html,new RegExp(`value="${value}"`));
 assert.match(app,/show\('clinicFollowup',needsResponse\)/);assert.match(app,/clinicFollowupPending=true/);assert.match(app,/MachiEngine\.clinicResponse\(soloGame,'solo',response,Date\.now\(\)\)/);
 assert.match(html,/この対応を選ぶ/);assert.match(app,/clinicRecordText\(\)/);
 assert.match(app,/街の指標に反映しました/);
 assert.match(app,/\/api\/vote/);assert.match(app,/request\('\/api\/vote'/);
});

test('clinic beat names the chosen location and presents one concise, accurate follow-up',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.match(app,/clinic\?clinicHeading\(\):event\.result/);
 assert.match(app,/function clinicHeading\(\)\{return `\$\{clinicRecord\.place==='station'\?'駅前':'郊外'\}に診療所ができた！`;}/);
 assert.match(app,/place==='駅前'\?'郊外から通う人には、駅前までの距離が残る。':'駅前を使う人には、診療所までの距離が残る。'/);
 assert.match(html,/<strong id="clinicResidentQuestion">どうする？<\/strong>/);
 assert.doesNotMatch(html,/clinicResponseCopy|住民から届いた「母の通院/);
 for(const [value,title,tradeoff] of [['review','根拠を確かめる','調査には時間がかかる'],['support','通院を支援する','場所の偏りは残る'],['revise','計画を見直す','便利さが下がる']]){
  const label=new RegExp(`<input type="radio" name="clinicResponse" value="${value}"><span><strong>${title}<\\/strong><small>${tradeoff}<\\/small>`);
  assert.match(html,label);
 }
 assert.equal((html.match(/name="clinicResponse" value="/g)||[]).length,3);
 assert.match(app,/clinicRecord\.response=response;clinicFollowupPending=false/);
 assert.match(app,/MachiEngine\.clinicResponse\(soloGame,'solo',response,Date\.now\(\)\)/);
 assert.match(app,/cityBeatHeading'\)\.textContent=clinicHeading\(\);renderCityBeatDeltas\(soloGame\)/);
 assert.match(app,/clinicResponse.*review.*support.*revise/s);
 assert.match(app,/renderCityBeatDeltas\(soloGame\)/);
 assert.match(fs.readFileSync(path.join(dir,'style.css'),'utf8'),/data-stage=\"city\"[^}]*city-ticker\{display:none\}/);
});

test('clinic choice stays concise while preserving location tradeoffs and AI rationale disclosure',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 assert.match(html,/1か所だけ。駅前は利用者が多く便利。郊外は通院の負担を減らせます。/);
 assert.match(html,/value="station">駅前/);assert.match(html,/value="suburb">郊外/);
 assert.match(html,/多くの人の使いやすさ/);assert.match(html,/通院が難しい人への届きやすさ/);
 assert.match(html,/AIの提案：駅前。予測利用者数、交通の便、人口構成などを使った提案です。/);
 assert.match(html,/個々の通院事情が提案にどれだけ影響したかは、この場で説明しきれません。/);
});

test('clinic story changes no engine behavior and shared votes retain their 23 second rules',()=>{
 const engine=fs.readFileSync(path.join(__dirname,'../engine.js'),'utf8');const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.equal(engine,fs.readFileSync(path.join(dir,'engine.js'),'utf8'));assert.match(engine,/ROUND_MS=23000/);assert.match(engine,/const SOLO_STORY=\[0,4,2,3\]/);assert.match(engine,/game\.storyMode==='solo'/);
 assert.match(app,/if\(view==='group'\)\{/);assert.match(app,/request\('\/api\/vote'/);
});
