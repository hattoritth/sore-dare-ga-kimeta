# PR18 Cold UX acceptance record — 2026-11-04

## Scope

Implemented first-time UX repairs against v17 source `88f7cdce095a848cc78ef86eb1c983928637405a` on `fix/f5-v18-cold-user-ux-20261104`. The animated 2.5D city, four-decision solo route, seven-decision shared route, ending rules, score calculations, and D1 schema were preserved. Engine changes are limited to the transit AI action label; the AI still builds the same market and receives the same values.

## Implemented

- Vote confirmation distinguishes a solo decision from a group vote awaiting majority resolution. It does not repeat `lastEvent.result` from the prior round. The group's prior result remains in its separate previous-result area.
- The ending save stage moves the original PNG and PDF buttons to the top of the save stage. The six-metric view and full card are native, keyboard-operable disclosure sections. Their open state is initialized on stage changes, not on polling. The print stylesheet now reaches the card inside the ending flow.
- Radar labels are split into title and value lines inside a wider SVG viewBox. The same SVG function is used by the on-screen view and exported result card.
- Human and AI decision cards show public action and tradeoff text. The AI card does not show metric chips or hidden ending metrics. Transit explains that the AI adds a station-front commercial facility while remote districts remain less connected.
- The waterfront human action names flood protection; its two follow-up choices describe listening to local voices or balancing district requests, and both still build the floodgate.
- Post-game feedback uses the ending class and recorded decisions. TRUE acknowledges complementary human and AI roles; NORMAL gives brief decision-specific reflection; BAD distinguishes all-AI and all-human routes. No TRUE conditions are exposed before the ending.
- The solo clinic form uses a compact two-column radio layout on narrow screens; radio labels retain a 44px minimum target. The group join screen explains seven decisions, 23 seconds per vote, majority selection, and late entry. The intro notes that the three visible numbers do not show the whole city.

## Verification — parent acceptance on Mac (2026-11-04)

- **145/145 tests passed** with `cd site && npm test` in the normal Mac execution environment. Both HTTP/server tests that failed under Codex sandbox passed outside isolation.
- `node scripts/validate-artifact.mjs`: PASS; `cmp site/engine.js site/public/engine.js`: PASS; `git diff --check`: PASS.
- Worker API code, D1 schema/migrations, hosting config and Site ID not edited. Both engine files change only the PUBLIC description of transit AI's action (same market build and impacts).
- Actual Chrome for Testing + Puppeteer offline solo play:
  - 390×844: HUMAN clinic station / total priority / review response, then AI transit, HUMAN waterfront balance, AI energy => NORMAL END; stage-5 PNG/PDF buttons visible without scrolling (`y=576–683`).
  - 1024×768: HUMAN clinic suburb/access/support, HUMAN transport, HUMAN waterfront balance, AI energy => TRUE END; stage-5 saves visible (`y=346–397`).
  - 1920×1080: all AI => BAD END; stage-5 saves visible (`y=362–414`).
  - No prior-round result is shown in the current-round vote feedback. Human/AI proposed actions, coastal protection and individual NORMAL reflection visible. Six-label radar text bounding boxes are inside the SVG viewBox on 390/1024/1920. No horizontal overflow.
- Mobile and iPad clinic confirmation buttons are visible immediately upon opening the detail form: 390×844 button y=728–776, iPad 1024×768 y=604–652, desktop 1920×1080 y=825–873. Radio labels remain >=44 px. The speech bubble is removed during the mobile/tablet detail step to avoid repeated information.
- Additional 320/375/430/768-width browser simulations: radar label bounding boxes within viewBox, no horizontal page overflow, save button heights 51px and 44px respectively. 768-width coverage separately exercised by shared group BrowserContext.
- PNG export actually downloaded using browser click: **486,676 bytes**, visually inspected: actual 2.5D town, TRUE end title, radar and all six scores. PDF generated in Chrome: **one page**, Mac PDFKit successfully extracted title, metrics and body copy, full town card.
- Independent Codex review identified a shared-NORMAL-end feedback issue: shared transit is round 5, not solo round 2. Fixed using roundTotal and added focused regression coverage (145/145 tests).
- Repeated group UAT on *unmodified* Worker code, localhost binding, in-memory temporary SQLite D1: 5 independent Chrome browser contexts at 390×844, 430×932, 820×1180, 1024×768, 1440×900; 1920×1080 separate audience monitor, 7 voting rounds HHHAAHH, 5 votes each round, true ending and minimum metric 46, prior votes rejected 409, original legacy table unchanged, no browser JS errors. This is **not** a physical 5-device nor production-D1 test.
- Original acceptance evidence and browser logs stay on the Mac under `/tmp/f5_v18_ux_acceptance_20261104`, `/tmp/f5_v18_ux_acceptance_20261104.log`, `/tmp/f5_v18_5browser_7round_worker_sqlite_uat.log`. Do not upload cookies or live player data.

## Release boundary / open items

- Existing production Sites remains **v17** until an explicit official Sites publish reports succeeded and the public URL is verified. This code branch and artifacts have **not** changed production.
- User has **explicitly authorized implementation, GitHub PR and Sites public deployment**, while preserving the same existing Site ID, URL, public access, D1 binding `DB`, `city_state` and `city_state_stage4`. No GitHub main merge is necessary for Sites.
- Official Sites release must use the pinned GitHub commit and verify the exact Worker SHA, `/app.js` SHA, hosting manifest, archived source and pre-/post-deploy D1 backup/schema/rows. **Pending migration count may be unavailable; user previously authorized the alternative safety procedure** with complete verified D1 backup, same DDL and no DB modification warnings; do not waive the backup requirement.
- Unverified: real iPhone/iPad Safari, real Cloudflare D1 concurrent latency/locking, physical 5-device Wi-Fi session and production replay. Local tests and Chrome simulations do not replace these.
