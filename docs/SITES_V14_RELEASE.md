# Sites release without hosted migration playback

This release branch is derived from GitHub HEAD 10b7b73a97ae217a7792d31b6b0ea3db0b381c50 (PR #7).

- Scope: existing Sites project appgprj_6ae596548c00819189f3f54ce3275e02 and existing public URL only.
- Difference: site/drizzle/ moved to docs/site-migration-history/ for review and test fixtures. The official Sites package builder only packages site/drizzle/, so the release archive contains no hosted migration SQL.
- Runtime and DB binding unchanged: Worker code is byte-identical to PR #7 when built; d1: DB, r2: null.
- Operational D1 writes: authorized gameplay updates to city_state_stage4; no schema migration, initialization, deletion, or manual overwrites. A no-op CREATE TABLE IF NOT EXISTS check remains in Worker.
- QA: Run cd site && npm test && node scripts/validate-artifact.mjs and official Sites packager. Verify inner Worker SHA256 71dc400ad95c3811c3f80798f3e2c150f5f2191495b815556108a3f6d93c58a9; verify tar file list has no drizzle/.
- Deploy: Use official Sites tools to open existing source, safely synchronize this exact release branch as a new Sites source commit, package and save a new version, then deploy with unchanged public audience. Do not submit a different archive against the prior source commit 8d5019d311fd03bbc45a4b25d105bda4dcc68233, which repeatedly returns v13.
- Safety: Preserve published v12, saved v13, existing DB rows and main branch; avoid force push. Verify deployment status, public UI/API/QR and existing D1. Restore v12 if necessary.

Historical migration SQL in docs is for tests and review, not for deployment.
