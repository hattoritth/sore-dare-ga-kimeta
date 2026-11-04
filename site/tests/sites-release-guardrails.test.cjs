const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, statSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');
const preflight = path.join(repoRoot, 'site/scripts/sites-release-preflight.mjs');
const chunkVerifier = path.join(repoRoot, 'site/scripts/verify-d1-chunks.mjs');
const manifest = JSON.stringify({ project_id: 'appgprj_6ae596548c00819189f3f54ce3275e02', d1: 'DB', r2: null }, null, 2) + '\n';

function temporary(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'sites-guardrails-'));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function git(dir, ...args) { return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function makeRepo(dir, changes = {}) {
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 'guardrails@example.invalid');
  git(dir, 'config', 'user.name', 'Guardrails Test');
  mkdirSync(path.join(dir, 'site/.openai'), { recursive: true });
  mkdirSync(path.join(dir, 'site/public'), { recursive: true });
  mkdirSync(path.join(dir, 'standalone'), { recursive: true });
  writeFileSync(path.join(dir, 'site/.openai/hosting.json'), manifest);
  writeFileSync(path.join(dir, 'site/public/index.html'), '<main>old</main>');
  writeFileSync(path.join(dir, 'standalone/それ、誰が決めた？_街が動く版.html'), '<!doctype html><main>synthetic</main>');
  git(dir, 'add', '.'); git(dir, 'commit', '-qm', 'base');
  const base = git(dir, 'rev-parse', 'HEAD');
  for (const [name, body] of Object.entries(changes)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
  git(dir, 'add', '.'); git(dir, 'commit', '-qm', 'target');
  return { base, target: git(dir, 'rev-parse', 'HEAD') };
}
function classify(dir, refs) {
  const result = spawnSync(process.execPath, [preflight, '--base', refs.base, '--target', refs.target], { cwd: dir, encoding: 'utf8' });
  return { code: result.status, json: JSON.parse(result.stdout), stderr: result.stderr };
}

test('preflight accepts a static UI-only diff but states what green does not prove', () => temporary((dir) => {
  const refs = makeRepo(dir, { 'site/public/index.html': '<main>new</main>', 'docs/release.md': 'notes' });
  const result = classify(dir, refs);
  assert.equal(result.code, 0); assert.equal(result.json.classification, 'UI_ONLY');
  assert.deepEqual(result.json.changedPaths, ['docs/release.md', 'site/public/index.html']);
  assert.ok(result.json.codeOnlyGreenDoesNotProve.includes('a complete current restorable D1 backup exists'));
}));

test('preflight makes worker, engine, schema, migration, and hosting changes high risk', () => {
  for (const changed of ['site/src/worker.mjs', 'site/engine.js', 'site/src/schema.sql', 'site/migrations/0001.sql', 'site/.openai/hosting.json']) temporary((dir) => {
    const refs = makeRepo(dir, { [changed]: changed.endsWith('.json') ? JSON.stringify({ project_id: 'other', d1: 'DB', r2: null }) : 'changed' });
    const result = classify(dir, refs);
    assert.equal(result.code, changed.endsWith('.json') ? 3 : 2, changed);
    assert.ok(['HIGH_RISK', 'INVALID'].includes(result.json.classification), changed);
  });
});

test('preflight requires the approved manifest and reviews other backend/unknown changes', () => {
  temporary((dir) => {
    const refs = makeRepo(dir, { 'site/.openai/hosting.json': JSON.stringify({ project_id: 'wrong', d1: 'DB', r2: null }) });
    assert.equal(classify(dir, refs).json.classification, 'INVALID');
  });
  for (const changed of ['site/server.mjs', 'package.json']) temporary((dir) => {
    const refs = makeRepo(dir, { [changed]: 'changed' });
    const result = classify(dir, refs);
    assert.equal(result.code, 2); assert.equal(result.json.classification, 'REVIEW_REQUIRED');
  });
});

test('preflight classifies the pinned v18 to v19 commit pair as UI_ONLY', () => {
  const result = spawnSync(process.execPath, [preflight, '--base', 'e593e691957c29840d3aff168a83843aebc18518', '--target', '3b977ea22019046559e1c7304b0d2d0a99ffe7c2'], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const json = JSON.parse(result.stdout);
  assert.equal(json.classification, 'UI_ONLY');
  assert.deepEqual(json.protectedPaths, []);
});

test('preflight compares an optional artifact hash against the target commit contents', () => temporary((dir) => {
  const refs = makeRepo(dir, { 'site/public/index.html': '<main>new</main>' });
  const artifact = git(dir, 'show', `${refs.target}:standalone/それ、誰が決めた？_街が動く版.html`);
  const sha = createHash('sha256').update(artifact).digest('hex');
  const matches = spawnSync(process.execPath, [preflight, '--base', refs.base, '--target', refs.target, '--expected-artifact-sha', sha], { cwd: dir, encoding: 'utf8' });
  assert.equal(matches.status, 0, matches.stderr); assert.equal(JSON.parse(matches.stdout).artifact.matchesExpected, true);
  const mismatch = spawnSync(process.execPath, [preflight, '--base', refs.base, '--target', refs.target, '--expected-artifact-sha', '0'.repeat(64)], { cwd: dir, encoding: 'utf8' });
  assert.equal(mismatch.status, 3); assert.equal(JSON.parse(mismatch.stdout).classification, 'INVALID');
}));

function makeChunkInput(text, chunkSizes, versions) {
  const bytes = Buffer.from(text, 'utf8');
  const chunks = []; let offset = 1; let index = 0;
  for (const size of chunkSizes) {
    const data = bytes.subarray(offset - 1, Math.min(offset - 1 + size, bytes.length));
    if (!data.length) continue;
    chunks.push({ id: 1, offset, version: versions?.[index] ?? '7', hex: data.toString('hex') });
    offset += data.length; index++;
  }
  if (offset <= bytes.length) chunks.push({ id: 1, offset, version: versions?.[index] ?? '7', hex: bytes.subarray(offset - 1).toString('hex') });
  return { expectedBytes: bytes.length, finalBytes: bytes.length, expectedVersion: '7', finalVersion: '7', expectedRowId: 1, chunks };
}
function verify(dir, input, outputName = 'private/reconstructed.json') {
  const inputPath = path.join(dir, 'input.json'); const outputPath = path.isAbsolute(outputName) ? outputName : path.join(dir, outputName);
  writeFileSync(inputPath, JSON.stringify(input));
  const result = spawnSync(process.execPath, [chunkVerifier, '--input', inputPath, '--output', outputPath], { cwd: repoRoot, encoding: 'utf8' });
  return { ...result, inputPath, outputPath };
}

test('chunk verifier joins fragmented UTF-8 and writes mode 0600 private output with hash-only metadata', () => temporary((dir) => {
  const original = JSON.stringify({ createdAt: 1760000000, round: 3, participants: { guest: { name: '合成' } }, message: '街🌆' });
  const result = verify(dir, makeChunkInput(original, [11, 7, 3]));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(result.outputPath, 'utf8')), JSON.parse(original));
  assert.equal(statSync(result.outputPath).mode & 0o777, 0o600);
  assert.equal(JSON.parse(result.stdout).status, 'VERIFIED');
  assert.equal(result.stdout.includes('街'), false);
}));

test('chunk verifier rejects overlaps, gaps, version changes, truncation, invalid JSON, and unsafe outputs', () => temporary((dir) => {
  const base = makeChunkInput(JSON.stringify({ id: 1, version: '7' }), [8]);
  const overlap = structuredClone(base); overlap.chunks[1] = { ...overlap.chunks[1], offset: overlap.chunks[0].offset };
  assert.equal(verify(dir, overlap).status, 2);
  const gap = structuredClone(base); gap.chunks[0].hex = gap.chunks[0].hex.slice(2); gap.chunks[1].offset += 1;
  assert.equal(verify(dir, gap).status, 2);
  const version = structuredClone(base); version.chunks[1].version = '8';
  assert.equal(verify(dir, version).status, 2);
  const mismatchedRowId = structuredClone(base); mismatchedRowId.chunks[1].id = 99;
  assert.equal(verify(dir, mismatchedRowId).status, 2);
  const changedAtEnd = structuredClone(base); changedAtEnd.finalVersion = '8';
  assert.equal(verify(dir, changedAtEnd).status, 2);
  const truncated = structuredClone(base); truncated.expectedBytes += 1;
  assert.equal(verify(dir, truncated).status, 2);
  const badJson = makeChunkInput('this is not JSON', [5]);
  assert.equal(verify(dir, badJson).status, 2);
  const tooLarge = structuredClone(base); tooLarge.expectedBytes = 256 * 1024 * 1024 + 1;
  assert.equal(verify(dir, tooLarge).status, 2);
  const invalid = structuredClone(base); invalid.expectedRowId = 99;
  assert.equal(verify(dir, invalid).status, 2);
  const unsafe = verify(dir, base, path.join(repoRoot, 'repository/should-not-exist.json'));
  assert.equal(unsafe.status, 2);
  assert.match(unsafe.stderr, /inside the repository/);
}));

test('chunk verifier refuses overwrites and malformed hex', () => temporary((dir) => {
  const input = makeChunkInput(JSON.stringify({ id: 1, version: '7' }), [9]);
  const first = verify(dir, input); assert.equal(first.status, 0, first.stderr);
  const overwrite = spawnSync(process.execPath, [chunkVerifier, '--input', first.inputPath, '--output', first.outputPath], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(overwrite.status, 2); assert.match(overwrite.stderr, /overwrite/);
  const malformed = structuredClone(input); malformed.chunks[0].hex = '0xz1';
  assert.equal(verify(dir, malformed).status, 2);
}));

test('chunk verifier optionally round-trips reconstructed data in built-in in-memory SQLite', () => temporary((dir) => {
  const input = makeChunkInput(JSON.stringify({ createdAt: 1760000000, phase: 'lobby', note: 'synthetic' }), [10]);
  const inputPath = path.join(dir, 'input.json'); const outputPath = path.join(dir, 'private/row.json');
  writeFileSync(inputPath, JSON.stringify(input));
  const result = spawnSync(process.execPath, [chunkVerifier, '--input', inputPath, '--output', outputPath, '--sqlite-check'], { cwd: repoRoot, encoding: 'utf8' });
  if (Number(process.versions.node.split('.')[0]) < 22) {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /node:sqlite|sqlite/i);
  } else {
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).sqliteRestored, true);
  }
}));

test('UI-only preflight advertises approved scoped R0 fallback but not authorization to publish', () => temporary((dir) => {
  const refs = makeRepo(dir, { 'site/public/index.html': '<main>updated</main>' });
  const result = classify(dir, refs);
  assert.equal(result.code, 0);
  assert.equal(result.json.classification, 'UI_ONLY');
  assert.ok(result.json.nextSteps.some(x => x.includes('approved R0-only backup fallback')));
  assert.ok(result.json.nextSteps.some(x => x.includes('separate per-release publication authorization')));
  assert.ok(result.json.codeOnlyGreenDoesNotProve.includes('publish is authorized'));
}));
