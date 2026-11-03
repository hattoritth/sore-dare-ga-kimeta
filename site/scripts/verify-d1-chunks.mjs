#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstat, mkdir, open, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

const MAX_BYTES = 256 * 1024 * 1024;
function usage() { throw new Error('Usage: node site/scripts/verify-d1-chunks.mjs --input <private-export.json> --output <private-restored.json> [--sqlite-check]'); }
function inside(parent, child) { const rel = relative(parent, child); return rel === '' || (!rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && rel !== '..' && !isAbsolute(rel)); }
const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--sqlite-check') { if (opts.sqliteCheck) usage(); opts.sqliteCheck = true; continue; }
  if (!['--input', '--output'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) usage();
  opts[args[i].slice(2)] = args[++i];
}
if (!opts.input || !opts.output) usage();

try {
  const repo = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
  const inputPath = resolve(opts.input);
  const outputPath = resolve(opts.output);
  if (inside(repo, outputPath)) throw new Error('Refusing to write reconstructed private data inside the repository.');
  const canonicalInput = await realpath(inputPath);
  if (inside(repo, canonicalInput)) throw new Error('Refusing to read private D1 data from inside the repository.');
  if (inputPath === outputPath) throw new Error('Input and output paths must differ.');
  const input = JSON.parse(await (await import('node:fs/promises')).readFile(inputPath, 'utf8'));
  if (!Number.isSafeInteger(input.expectedBytes) || input.expectedBytes <= 0 || input.expectedBytes > 64 * 1024 * 1024) throw new Error('expectedBytes must be a positive safe integer no larger than 64 MiB.');
  if (input.expectedBytes > MAX_BYTES) throw new Error(`expectedBytes exceeds the ${MAX_BYTES} byte safety limit.`);
  if (typeof input.expectedVersion !== 'string' && typeof input.expectedVersion !== 'number') throw new Error('expectedVersion must be a string or number.');
  if (input.expectedRowId === undefined || !Array.isArray(input.chunks) || input.chunks.length === 0) throw new Error('expectedRowId and a non-empty chunks array are required.');
  if (input.finalVersion !== input.expectedVersion || input.finalBytes !== input.expectedBytes) throw new Error('The final row version/length verification does not match the snapshot start.');
  const bytes = Buffer.alloc(input.expectedBytes);
  const covered = new Uint8Array(input.expectedBytes);
  for (const chunk of input.chunks) {
    if (chunk.id !== input.expectedRowId) throw new Error('Chunk row id differs from expectedRowId.');
    if (chunk.version !== input.expectedVersion) throw new Error('Chunk row version changed during export.');
    if (!Number.isSafeInteger(chunk.offset) || chunk.offset < 1 || typeof chunk.hex !== 'string' || chunk.hex.length === 0 || chunk.hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(chunk.hex)) throw new Error('Each chunk needs a positive 1-based offset and non-empty even-length hex bytes.');
    const data = Buffer.from(chunk.hex, 'hex');
    const start = chunk.offset - 1;
    if (start + data.length > input.expectedBytes) throw new Error('Chunk extends beyond expected byte length (truncated/oversized export).');
    for (let j = 0; j < data.length; j++) {
      if (covered[start + j]) throw new Error('Chunk coverage overlaps.');
      covered[start + j] = 1;
    }
    data.copy(bytes, start);
  }
  const gap = covered.indexOf(0);
  if (gap !== -1) throw new Error(`Chunk coverage has a gap at byte offset ${gap + 1}.`);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const row = JSON.parse(text);
  if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new Error('Reconstructed D1 JSON is not an object.');
  // SQL columns id/version belong to the table row, not the JSON game payload.
  const digest = createHash('sha256').update(bytes).digest('hex');
  let sqliteRestored = null;
  if (opts.sqliteCheck) {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(':memory:');
    try {
      db.exec('CREATE TABLE city_state_stage4 (id PRIMARY KEY, version, json NOT NULL)');
      db.prepare('INSERT INTO city_state_stage4 (id, version, json) VALUES (?, ?, ?)').run(input.expectedRowId, input.expectedVersion, text);
      const restored = db.prepare('SELECT id, version, json FROM city_state_stage4 WHERE id = ?').get(input.expectedRowId);
      sqliteRestored = restored.id === input.expectedRowId && String(restored.version) === String(input.expectedVersion) && restored.json === text;
      if (!sqliteRestored) throw new Error('In-memory SQLite round-trip did not match reconstructed row.');
    } finally { db.close(); }
  }
  let existingAncestor = dirname(outputPath);
  while (true) {
    try { existingAncestor = await realpath(existingAncestor); break; }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = dirname(existingAncestor);
      if (parent === existingAncestor) throw error;
      existingAncestor = parent;
    }
  }
  if (inside(repo, existingAncestor)) throw new Error('Refusing to create reconstructed private data inside the repository (resolved ancestor path).');
  await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
  const canonicalOutputParent = await realpath(dirname(outputPath));
  if (inside(repo, canonicalOutputParent)) throw new Error('Refusing to write reconstructed private data through a symlink into the repository.');
  const actualParent = await realpath(dirname(outputPath));
  if (inside(repo, actualParent)) throw new Error('Refusing to write reconstructed private data inside the repository (resolved parent path).');
  try { await lstat(outputPath); throw new Error('Refusing to overwrite an existing output path.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const handle = await open(outputPath, 'wx', 0o600);
  try { await handle.writeFile(bytes); } finally { await handle.close(); }
  process.stdout.write(`${JSON.stringify({ status: 'VERIFIED', output: outputPath, expectedBytes: input.expectedBytes, sha256: digest, rowId: input.expectedRowId, version: input.expectedVersion, chunkCount: input.chunks.length, utf8: true, json: true, sqliteRestored }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ status: 'REJECTED', error: error.message })}\n`);
  process.exitCode = 2;
}
