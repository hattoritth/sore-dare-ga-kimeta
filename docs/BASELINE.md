# Baseline and migration status

## Confirmed states (2026-10-31)
- ChatGPT Sites project: `appgprj_6ae596548c00819189f3f54ce3275e02`
- Owner-only URL: `https://machi-no-tsuzuki-20261031.tthkpba.chatgpt.site/`
- Work reported saved/deployed Sites **v5**, owner-only access. v4 retained.
- v5 contains the title 「それ、誰が決めた？」, 2036年の導入、iPad横向きの街＋会話レイアウト、solo/group/display paths, game rules and D1 integration.
- v5 is a **site snapshot, not yet verified identical** to any previously generated ZIP.

## Known older local material
- v12.4 original city visualization HTML; v13 hidden metrics; v14 retro; v15 editorial.
- Earlier exported `machi_no_tsuzuki_sites_ready.zip` on Mac is **older than Sites v5**.
- Local v16/v17 archives existed during design iteration. Do not assume they match v5.

## Migration gate (must finish before coding against main)
1. Export the exact current Sites v5 source + assets through the Sites owner workflow (read-only).
2. Record file hashes (SHA-256) for export and dependency assets. Remove credentials, user data and unnecessary generated files before commit.
3. Compare with earlier local sources and explicitly document any deltas.
4. Add the verified source to this private repo as a reviewed commit/PR; don't overwrite the existing site.
5. Execute `npm test` and browser-based tests; document emulator vs real-device vs real-D1 evidence separately.
6. Only then declare the repo source the current development baseline.

Until gate completion: **do not claim the repo contains the live game**, and do not rebuild Sites from an older ZIP.
