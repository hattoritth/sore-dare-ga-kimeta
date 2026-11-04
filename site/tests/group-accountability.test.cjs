const test=require('node:test');
const assert=require('node:assert/strict');
const {present,list}=require('../public/group-accountability.js');
const event=(chosen,human,ai,round=1)=>({round,heading:'診療所をどこへ？',chosen,human,ai});

test('reports when personal choice differs from the city outcome',()=>{
 const row=present(event('ai',1,2),'human');
 assert.equal(row.personal,'人が判断する');assert.equal(row.outcome,'AIの案');assert.equal(row.tally,'人 1票 / AI 2票');
});
test('reports matching personal choice and group outcome',()=>{
 const row=present(event('human',3,1),'human');assert.equal(row.outcome,'人の案');assert.equal(row.personal,'人が判断する');
});
test('reports tied and no-vote outcomes distinctly',()=>{
 assert.equal(present(event('mixed',2,2),'ai').outcome,'同数のため保留');
 assert.equal(present(event('none',0,0),null).outcome,'投票なし');
});
test('missing personal record and departed participant are explicit',()=>{
 assert.equal(present(event('ai',0,1),null,true).personal,'このタブでの記録なし');
 assert.equal(present(event('ai',0,1),null,false).personal,'参加者ではありません');
});
test('history uses authoritative outcomes and round-keyed ephemeral choices',()=>{
 const choices=new Map([[1,'human'],[2,'ai']]);
 const rows=list([event('ai',1,2,1),event('human',3,1,2)],choices);
 assert.deepEqual(rows.map(x=>[x.personal,x.outcome]),[['人が判断する','AIの案'],['AIに任せる','人の案']]);
 choices.set(1,'ai');assert.equal(list([event('ai',1,2,1)],choices)[0].personal,'AIに任せる');
 choices.clear();assert.equal(list([event('ai',1,2,1)],choices)[0].personal,'このタブでの記録なし');
});

test('browser capture is transient, round-keyed, confirmed only for active participants, and reset by city identity',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
 assert.match(app,/groupPersonalVotes=new Map\(\)/);
 assert.match(app,/if\(groupVoteCityStartedAt!==s\.cityStartedAt\)\{groupVoteCityStartedAt=s\.cityStartedAt;groupPersonalVotes=new Map\(\);\}/);
 assert.match(app,/s\.phase==='active'&&s\.isParticipant&&s\.hasVoted/);
 assert.match(app,/groupPersonalVotes\.set\(s\.round\+1,s\.myOptionVote\|\|s\.myVote\)/);
 assert.doesNotMatch(app,/localStorage|sessionStorage/);
});
