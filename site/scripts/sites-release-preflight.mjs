#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const usage = 'Usage: node site/scripts/sites-release-preflight.mjs --base <git-ref> --target <git-ref> [--expected-artifact-sha <sha256>]';
function fail(message) {
  process.stderr.write(`${message}\n${usage}\n`);
  process.exit(3);
}
const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  if (!['--base', '--target', '--expected-artifact-sha'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) fail(`Invalid argument: ${args[i]}`);
  opts[args[i].slice(2)] = args[++i];
}
if (!opts.base || !opts.target) fail('Both --base and --target are required.');
if (opts['expected-artifact-sha'] && !/^[a-f0-9]{64}$/i.test(opts['expected-artifact-sha'])) fail('Expected artifact SHA-256 must be 64 hexadecimal characters.');

function git(...gitArgs) {
  return execFileSync('git', gitArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
let paths;
try {
  git('rev-parse', '--verify', `${opts.base}^{commit}`);
  git('rev-parse', '--verify', `${opts.target}^{commit}`);
  const entries = git('diff', '--name-status', '-z', '--no-renames', opts.base, opts.target, '--').split('\0').filter(Boolean);
  if (entries.length % 2 !== 0) fail('Unexpected git diff --name-status output.');
  paths = [];
  for (let i = 0; i < entries.length; i += 2) paths.push(entries[i + 1]);
} catch (error) {
  fail(`Unable to compare refs: ${error.message}`);
}

const changedPaths = [...new Set(paths)].sort();
const manifestPath = 'site/.openai/hosting.json';
let manifest = null;
let manifestMatches = false;
try {
  manifest = JSON.parse(git('show', `${opts.target}:${manifestPath}`));
  manifestMatches = manifest.project_id === 'appgprj_6ae596548c00819189f3f54ce3275e02' && manifest.d1 === 'DB' && manifest.r2 === null;
} catch { /* Missing or invalid manifest is a fail-closed result below. */ }

const protectedPaths = changedPaths.filter((p) =>
  p === 'site/src/worker.mjs' || p === 'site/src/schema.sql' || p === 'site/engine.js' || p === 'site/public/engine.js' ||
  /^site\/(?:[^/]*\/)*(?:migrations?|drizzle)\//i.test(p) || /(^|\/)(?:migration|migrations|schema)(?:\.[^/]*)?$/i.test(p) || p === manifestPath
);
const backendPaths = changedPaths.filter((p) =>
  /^site\/(?:src|worker|server)(?:\/|\.)/.test(p) || /^site\/[^/]*\.(?:mjs|cjs)$/.test(p)
).filter((p) => !protectedPaths.includes(p));
const allowedUiPaths = changedPaths.filter((p) =>
  /^(?:README|AGENTS)\.md$/i.test(p) || /^docs\/.*\.md$/i.test(p) || /^site\/tests\//.test(p) ||
  /^site\/public\/.*\.(?:html|css|js|svg|png|jpe?g|webp|woff2?)$/i.test(p) ||
  /^standalone\/.*\.html$/i.test(p)
);
const unclassifiedPaths = changedPaths.filter((p) => !allowedUiPaths.includes(p) && !protectedPaths.includes(p) && !backendPaths.includes(p));
let classification;
const reasons = [];
if (!manifestMatches) {
  classification = 'INVALID';
  reasons.push('Target hosting manifest is missing, invalid, or does not match the approved project/D1/R2 mapping.');
} else if (protectedPaths.length) {
  classification = 'HIGH_RISK';
  reasons.push('Worker, engine, schema, migration, or hosting manifest changed; require DB review and the R1/R2 gates.');
} else if (backendPaths.length) {
  classification = 'REVIEW_REQUIRED';
  reasons.push('Other server/backend code changed; classify impact before any release.');
} else if (unclassifiedPaths.length) {
  classification = 'REVIEW_REQUIRED';
  reasons.push('Changed paths are outside the allowed UI/docs/tests set; review before release.');
} else {
  classification = 'UI_ONLY';
  reasons.push('Changed paths are limited to UI/assets/docs/tests and other non-backend files.');
}

let artifact = null;
if (opts['expected-artifact-sha']) {
  const artifactPath = 'standalone/それ、誰が決めた？_街が動く版.html';
  try {
    const bytes = execFileSync('git', ['show', `${opts.target}:${artifactPath}`], { encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'] });
    const { createHash } = await import('node:crypto');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    artifact = { path: artifactPath, sha256, matchesExpected: sha256 === opts['expected-artifact-sha'].toLowerCase() };
    if (!artifact.matchesExpected && classification === 'UI_ONLY') {
      classification = 'INVALID';
      reasons.push('Target standalone artifact SHA-256 does not match the expected value.');
    }
  } catch {
    artifact = { path: artifactPath, readable: false, matchesExpected: false };
    if (classification === 'UI_ONLY') {
      classification = 'INVALID';
      reasons.push('Target standalone artifact is missing or unreadable.');
    }
  }
}

const result = {
  classification,
  base: opts.base,
  target: opts.target,
  manifest: { path: manifestPath, matchesExpected: manifestMatches, project_id: manifest?.project_id ?? null, d1: manifest?.d1 ?? null, r2: manifest?.r2 ?? null },
  changedPaths,
  reasons,
  protectedPaths,
  backendPaths,
  unclassifiedPaths,
  artifact,
  codeOnlyGreenDoesNotProve: ['a complete current restorable D1 backup exists', 'restore was verified', 'platform-side migrations are absent', 'publish is authorized'],
  nextSteps: classification === 'UI_ONLY'
    ? ['Follow docs/SITES_RELEASE_PLAYBOOK.md and the 2026-11-04 approved R0-only backup fallback policy.', 'Prefer a new complete backup; when unsupported, require a verified full baseline backup plus all scoped R0 gates before publishing.', 'Confirm exact target commit/artifacts and separate per-release publication authorization.']
    : ['Stop before release and follow the applicable DB review and backup/restore gates in docs/SITES_RELEASE_PLAYBOOK.md.'],
  limitations: ['Classification is conservative path-based triage, not proof of runtime behavior or platform state.', 'No production DB, credentials, or external service is accessed.']
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = classification === 'UI_ONLY' ? 0 : (classification === 'INVALID' ? 3 : 2);
