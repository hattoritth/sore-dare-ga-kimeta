# UX playtest — prologue and solo pacing (2026-10-31)

Scope: Sites saved v5 exported to GitHub `import/sites-v5`, tested locally in a separate feature worktree. **No Sites deployment.**

## Bug reproduced
At 1440×900, the Next button top coordinates across four prologue scenes before fix were 608, 613, **693**, 613px (the long third scene moved it 85px).
iPad 1024×768: 541, 541, 554, 541px. iPhone 390×844: 560, 560, 585, 560px. Small iPhone 375×667: 460, 460, 490, 460px.

## Changes
- A fixed-height, grid-based story stage keeps Next and Skip anchored in the same row regardless of text length; its text region can scroll on smaller screens.
- Responsive story typography and a constant Next button width prevent both position and adjacent Skip movement.
- On the entry screen, the illustrated city fills the available stage, while redundant city labels behind the dialogue are hidden.
- Solo play is **player-paced**: reading a decision no longer auto-expires after 23 seconds; after voting, the agent reacts for ~2.2 seconds before the city changes. A vote cannot be submitted twice while the reaction runs. The ending remains until replay.
- The 23-second shared-mode timer, multiplayer API, D1 adapter, city art, and public/secret metric rules are unchanged.

## Verification evidence
- Browser-based visual geometry (headless Google Chrome/Puppeteer) for all four scenes and 4 sizes:
  - Desktop 1440×900: Next y=668 for all scenes.
  - iPad landscape 1024×768: Next y=602 for all scenes.
  - Phone 390×844: Next y=621 for all scenes.
  - Small phone 375×667: Next y=491 for all scenes.
  - No horizontal document overflow or story text-scroller overflow for these tested sizes; mode selection reachable after scene 4.
- Solo E2E: iPad human-choice path completed all 7 decisions and showed the ending. Phone all-AI path reached the hidden-foundations game-over after the fourth decision. The earlier generic 7-step phone script incorrectly attempted a fifth choice after game-over; an instrumented run confirmed the game ended as designed.
- Local shared-mode browser test: two isolated phone clients joined one city; one voted AI, the other human; both votes counted, the monitor showed 2 participants and an entrance QR; no hidden `shadow` values were present in the in-progress API response; no browser JS exceptions.
- `bash scripts/build.sh`, `node scripts/validate-artifact.mjs`, and `npm test`: **9/9 successful**.
- `git diff --check`: passed.

## Not tested / release caution
- Real iPhone/iPad hardware, accessibility with VoiceOver, actual Sites D1, multi-device Wi-Fi reliability, and QR camera reading were **not** retested.
- Solo offline HTML exported separately for review; only solo runs without a server. Shared mode requires the local server or a future approved Sites deployment.
- Do not deploy from this branch without reviewing and explicitly authorizing the Sites change. Keep existing Sites v5 unchanged.

## Restoring v12.4 motion: typing and automatic story advance
The original v12.4 file was examined directly. It used approximately 42 ms per Unicode character and automatically progressed narrative scenes at programmed durations (roughly 2.9 to 4.8 seconds; the name-entry step remained interactive). It also had cinematic scene camera focus.

For the current four-scene entry, restored:
- character-by-character dialogue at 42 ms per character, an accessible full-line announcement (no per-character screen-reader announcements), and a subtle typing caret;
- automatic transitions after approximately 2.9 / 3.9 / 5.6 / 4.0 seconds (longer third scene allows reading); the final transition stops at the manual solo/group mode choice;
- manual Next completes partial typing on first press, and advances on a subsequent press; Skip immediately shows the mode choice;
- prefers-reduced-motion users receive complete lines immediately without blinking carets;
- fixed-height text region and anchored Next/Skip layout are preserved.

### Additional browser verification (headless Chrome)
- 1440x900, 1024x768 landscape, 390x844, 375x667: all four scenes automatically advance without clicks; modeChoice becomes visible and no JavaScript exceptions occur.
- Next y stayed identical across all four stages: desktop 668px; iPad 602px; iPhone 621px; small iPhone 491px. Skip stays fixed, no horizontal overflow.
- At ~120 ms after entry, only two characters appeared and typing was true. At ~1020 ms the entire first line appeared and typing was false.
- Manual next, skip, and prefers-reduced-motion branches verified.
- Build, artifact validation, and npm test: 9/9 pass.

Remaining nuance: v12.4's per-scene camera focus is not reintroduced; current ambient city camera animation remains. Do not describe this as a full restoration of all v12.4 animations.
