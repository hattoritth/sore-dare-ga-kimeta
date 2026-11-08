const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const read = name => readFileSync(path.join(__dirname, '../public', name), 'utf8');
const html = read('index.html');
const app = read('app.js');

test('the 2036 introduction gives visitors a persistent choice to reach the game modes', () => {
  assert.match(html, /id="prologueSkip"[^>]*>遊び方を選ぶ</);
  assert.doesNotMatch(app, /prologueTimes|runPrologue/);
});

test('the decision panel identifies who will decide without changing the submitted option ID', () => {
  assert.match(html, /id="humanDecisions"[^>]*aria-labelledby="humanDecisionTitle"/);
  assert.match(html, /id="delegatedDecisions"/);
  assert.match(app, /button\.dataset\.vote=option\.id/);
});

test('the ending starts with the game result and the conference remains available from it', () => {
  assert.match(app, /endingFlowCityStartedAt=s\.cityStartedAt;endingFlowStage=4;pressOpen=false;pressDone=true/);
  assert.match(html, /id="openEndingPress"[^>]*>2066年の記者会見を見る</);
  assert.ok(html.indexOf('id="endingTitle"') < html.indexOf('id="endingCardTools"'));
});
