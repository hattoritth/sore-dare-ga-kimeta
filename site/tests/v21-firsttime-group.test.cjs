'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
const helperSource=app.match(/const groupEntryUX=Object\.freeze\((\{[\s\S]*?\})\);/);
assert.ok(helperSource,'group entry UX helper must exist in app.js');
const groupEntryUX=vm.runInNewContext(`(${helperSource[1]})`);

test('first-time group entry shows reveal notice only for an anonymous guest during reveal',()=>{
 const phases=['lobby','active','reveal','waiting'];
 for(const phase of phases){
  const anonymous={phase,isParticipant:false};
  assert.equal(groupEntryUX.shouldShowRevealNotice('group',anonymous),phase==='reveal',`anonymous ${phase}`);
  assert.equal(groupEntryUX.shouldShowRevealNotice('group',{phase,isParticipant:true}),false,`participant ${phase}`);
  assert.equal(groupEntryUX.shouldShowRevealNotice('solo',anonymous),false,`solo ${phase}`);
 }
});

test('solo navigation is available only from the shared anonymous reveal notice',()=>{
 const destinations=[];
 const navigate=href=>destinations.push(href);
 for(const phase of ['lobby','active','waiting'])groupEntryUX.navigateToSolo('group',{phase,isParticipant:false},navigate);
 groupEntryUX.navigateToSolo('group',{phase:'reveal',isParticipant:true},navigate);
 groupEntryUX.navigateToSolo('solo',{phase:'reveal',isParticipant:false},navigate);
 assert.deepEqual(destinations,[]);
 groupEntryUX.navigateToSolo('group',{phase:'reveal',isParticipant:false},navigate);
 assert.deepEqual(destinations,['/?mode=solo']);
 assert.match(app,/groupRevealSolo'\)\.onclick=\(\)=>groupEntryUX\.navigateToSolo\(view,state,goto\)/);
});

test('reveal notice is compact, announced as status, and placed before the ending CTA',()=>{
 const notice=html.match(/<div class="group-reveal-notice" id="groupRevealNotice"[\s\S]*?<\/div>/)?.[0]||'';
 assert.match(notice,/role="status" aria-live="polite" aria-atomic="true"/);
 assert.match(notice,/今は結果を表示中です。次の街から参加できます。/);
 assert.match(notice,/ひとりで遊ぶ →/);
 assert.ok(html.indexOf('id="groupRevealNotice"')<html.indexOf('id="endingProgress"'));
 assert.match(app,/groupRevealNotice'\)\.hidden=!groupEntryUX\.shouldShowRevealNotice\(view,s\)/);
 assert.doesNotMatch(app,/const ticker=groupEntryUX\.shouldShowRevealNotice/,'avoid repeating the announcement in the street ticker');
 assert.match(css,/\.group-reveal-notice button\{[^}]*min-height:44px/);
 assert.match(css,/\.group-reveal-notice\{[^}]*grid-column:1\/-1/);
});


test('browser QA blocks all non-read-only requests and mocks live group state',()=>{
 const qa=fs.readFileSync(path.join(root,'scripts/qa-v21-group-entry.cjs'),'utf8');
 assert.match(qa,/r\.method\(\)!=='GET'&&r\.method\(\)!=='HEAD'/);
 assert.match(qa,/u\.pathname==='\/api\/state'/);
 assert.match(qa,/Engine\.publicState/);
 assert.match(qa,/sourceOrigin=new URL\(base\)\.origin/);
 assert.doesNotMatch(qa,/--no-sandbox/,'QA must keep Chromium sandbox enabled');
});
