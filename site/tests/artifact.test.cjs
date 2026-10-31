const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

class MockD1 {
  constructor() {
    this.db = new DatabaseSync(':memory:');
    this.db.exec(readFileSync(resolve(__dirname, '../drizzle/0000_city.sql'), 'utf8'));
  }
  prepare(sql) {
    let args = [];
    const db = this.db;
    return {
      bind(...values) { args = values; return this; },
      async first() { return db.prepare(sql).get(...args) || null; },
      async run() { const result = db.prepare(sql).run(...args); return { meta: { changes: Number(result.changes) } }; },
    };
  }
}

test('built Worker aggregates simultaneous votes and discloses hidden values only at the ending', async () => {
  const source = readFileSync(resolve(__dirname, '../dist/server/index.js'));
  const worker = (await import(`data:text/javascript;base64,${source.toString('base64')}`)).default;
  const db = new MockD1(), env = { DB: db }, origin = 'https://city.example';
  const call = (path, method = 'GET', body, cookie) => worker.fetch(new Request(origin + path, {
    method,
    headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), env);
  const landing = await call('/');
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /ひとりで遊ぶ/);
  const joined = await Promise.all(Array.from({ length: 5 }, (_, i) => call('/api/join', 'POST', { name: `P${i}` })));
  assert.deepEqual(joined.map((r) => r.status), [200, 200, 200, 200, 200]);
  const cookies = joined.map((r) => r.headers.get('set-cookie').split(';')[0]);
  const votes = await Promise.all(cookies.map((cookie, i) => call('/api/vote', 'POST', { choice: i < 2 ? 'human' : 'ai', round: 0 }, cookie)));
  assert.deepEqual(votes.map((r) => r.status), [200, 200, 200, 200, 200]);
  const state = await (await call('/api/state')).json();
  assert.equal(state.participantCount, 5);
  assert.equal(state.voteCount, 5);
  assert.equal(state.shadow, undefined);
  assert.ok(!JSON.stringify(state).includes('resilience'));
  const reconnected = await (await call('/api/state', 'GET', undefined, cookies[0])).json();
  assert.equal(reconnected.myVote, 'human');
  assert.equal((await call('/api/vote', 'POST', { choice: 'human', round: 0 }, cookies[0])).status, 200);
  assert.equal((await call('/api/vote', 'POST', { choice: 'ai', round: 0 }, cookies[0])).status, 409);
  const qr = await call('/api/qr.svg?url=' + encodeURIComponent(origin + '/'));
  assert.equal(qr.status, 200);
  assert.match(await qr.text(), /<svg[\s\S]+<path/);
  assert.equal((await call('/api/qr.svg?url=' + encodeURIComponent(origin + '/?mode=group'))).status, 400);
  const row = db.db.prepare('SELECT json FROM city_state WHERE id=1').get();
  const game = JSON.parse(row.json);
  game.shadow.trust = 21;
  game.votes = { [cookies[0].split('=')[1]]: 'ai' };
  game.roundEndsAt = Date.now() - 1;
  db.db.prepare('UPDATE city_state SET json=? WHERE id=1').run(JSON.stringify(game));
  const ending = await (await call('/api/state')).json();
  assert.equal(ending.phase, 'reveal');
  assert.equal(ending.outcome, 'collapse');
  assert.ok(ending.shadow.trust <= 20);
});
