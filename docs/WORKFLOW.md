# Development workflow

## Model / tool ownership
- Chat: requirements, trade-offs, roadmap, result integration and review.
- Codex: Mac local development, code, tests, Git branches, CI fixes.
- Canva: original character / UI / scene assets; import only after license and export/quality validation.
- Work: Sites source export or cross-app steps **only when necessary**, and controlled Sites integration testing.
- Sites: hosting and real-D1 verification, **not** the primary daily code editor.

## Iteration cadence
1. Codex works locally on a short-lived feature branch; HTML prototype in browser.
2. Review visual comparison for 1024×768 landscape, 390×844 portrait and 1920×1080 monitor.
3. Run automated unit/API/UX tests and record screenshots.
4. Open Draft PR, review functionality, aesthetics, accessibility and regression risk. Obtain important decisions from the user.
5. Merge only with explicit approval and passing quality gates.
6. Sites integration at meaningful milestones, not after every visual adjustment:
   - design / game-feel accepted;
   - shared-mode end-to-end complete;
   - exhibition release candidate.
   Extra integration allowed for Sites-specific risks, but document the reason.

## Release gate
- Obtain and preserve a recoverable prior Sites version.
- Inspect diff against the currently deployed source.
- Save a new owner-only Sites version; verify site actual response and mobile/tablet/monitor UX.
- Real D1: concurrent votes, retry, disconnected clients, reset, cross-device QR, hidden metrics.
- Request separate explicit permission before **public release**, external sharing, changing auth/permissions or launch-time irreversible actions.

## Test vs deploy
Static/local browser verification is **not** evidence that Sites D1 works.
A simulated SQLite D1 test is **not** real Sites D1 verification.
A saved Sites version is **not** proof that all devices can access it.

## Source/asset controls
- Avoid committing large screenshot binaries unnecessarily. Use test artifact storage for evidence.
- Include attribution/license notes for imported packages and Canva assets.
- Never commit secrets, credentials, cookies, private company content or user identifiers.
