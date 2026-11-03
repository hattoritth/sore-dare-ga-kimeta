'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../public/style.css'),'utf8');

test('the head of department speaks only one main question without duplicated headings or source chips',()=>{
 const conversation=html.match(/<div class="conversation" id="conversation">([\s\S]+?)<div id="riskNotice"/)?.[1];
 assert.ok(conversation);
 assert.match(conversation,/<h2 id="agentLine" class="agent-line">/);
 assert.match(conversation,/id="questionHint" hidden/);
 for(const redundant of ['id="residentLabel"','id="questionTitle"'])assert.ok(!conversation.includes(redundant));
 assert.doesNotMatch(html,/市長として、どう決めますか？|class="decision-prompt"|class="choices-jump"/);
 assert.match(css,/\.question-panel \.speech-bubble \.agent-line/);
});

test('clinic keeps an explicit but short station-versus-suburbs tradeoff; other episodes do not repeat their hint',()=>{
 const facts=app.match(/const conciseFacts=\{([^}]+)\}/)?.[1];
 assert.ok(facts);
 assert.match(facts,/clinic:'駅前：多くの人に便利　／　郊外：通院の負担を軽くできる'/);
 assert.doesNotMatch(facts,/office:|transit:|waterfront:|energy:|parkA:|school:/);
 assert.match(app,/show\('questionHint',!!fact\)/);
 assert.match(app,/\$\('agentRole'\)\.textContent=staffRole/);
});

test('the mayor is still offered both actions; AI is one tap and public estimates remain only on human option',()=>{
 assert.match(html,/id="humanDecision"/);
 assert.match(html,/id="humanImpact"/);
 assert.match(html,/id="aiDecision"/);
 assert.match(html,/id="aiImpact"[^>]*hidden/);
 assert.match(app,/renderImpact\('humanImpact',e\.impactPreview\?\.human\)/);
 assert.match(app,/e\.aiNow,e\.aiLater/);
});
