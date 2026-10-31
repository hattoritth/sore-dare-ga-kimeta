# Sites v5 import evidence

- Project: `appgprj_6ae596548c00819189f3f54ce3275e02`; saved version 5.
- Sites source commit: `9946fe99cbed8bfc562441b8b1873462c4651f7d`. The Sites saved-version listing returned this commit; source extracted from the matching Git commit, not from an old ZIP.
- Files in `site/` are the tracked source tree at that commit. `SITES_V5_SHA256SUMS` records SHA-256 for every imported source file. Runtime data, cookies, credentials, ignored files and generated `dist/` are excluded. `.openai/hosting.json` contains the existing project identity and D1 binding, not credentials; do not use it to deploy without explicit approval.
- Saved build archive reported by Sites: SHA-256 `2d0ee657d6332a6ed4782167361e578c90e693613ec4811538abee074b7fb679` (deployment artifact, distinct from this source export).

## Comparison with older v17 ZIP

The Library file `machi_no_tsuzuki_v17_cinematic.zip` was compared by SHA-256. `public/city-art.js`, both engine copies and QR modules match. `public/app.js`, `public/index.html`, `public/style.css`, `server.mjs`, `src/worker.mjs`, and `tests/worker.test.cjs` differ. The old v17 ZIP has five WebP city/character assets and standalone HTML absent from v5; v5 has Sites build, schema migration and artifact test files absent from the ZIP. These are separate versions, not an upgrade or downgrade determination.

## License / data review

The vendored QRCode JS identifies Kazuhiko Arase and MIT license in `vendor/LICENSE-notice.txt` and source headers. The export contains an attribution and license URL but not a full MIT license text; verify upstream provenance and include the complete license notice before broader distribution. No npm dependencies are declared. City/character graphics are code and SVG in the source; their original rights and asset provenance have not been independently verified. No Canva or v17 WebP assets were imported. No license is declared for the project as a whole. A targeted textual scan found no embedded credentials or live user records; it is not a complete security audit.

## Verification

Run `cd site && bash scripts/build.sh && node scripts/validate-artifact.mjs && npm test`. Fresh `npm test` before the build fails because `dist/server/index.js` is absent. After build, artifact validation succeeds and all 9 tests pass, including mock D1, HTTP and five-participant cases. Real Sites D1, live multi-device voting and production reconnect were not tested in this export. Sites was not modified or deployed.
