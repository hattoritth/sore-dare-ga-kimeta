# Acceptance / verification matrix

| Area | Requirement | How to verify |
|---|---|---|
| Entry | 2036 prologue (4 scenes), skip, solo/group selection | Browser flow and screenshots |
| Title | Main title 「それ、誰が決めた？」 | All screens + site metadata |
| City | Initial 2.5D map + ambient animation preserved | Side-by-side with v12.4 and Sites v5 |
| Characters | Four agents + short talk → 2 choices → visible reaction | Flow test for each agent |
| Visible metrics | Prosperity, convenience, appeal only | DOM and screenshot check |
| Hidden metrics | Trust, fairness, sustainability hidden before ending | DOM **and network/API** checks |
| Tablet | Landscape 1024×768; city and conversation visible together | Browser emulation then physical iPad |
| Phone | Portrait 390×844, usable buttons ≥44px, no horizontal scroll | Emulation then physical iPhone |
| Display | 1920×1080, shared town state, entrance QR | Display view with live mock + real server |
| Shared voting | Simultaneous 5 clients, one logical city | Integration test + real Sites D1 |
| Network | Refresh/reconnect/duplicate votes/concurrency safe | HTTP integration + failure injection |
| Ending | Three hidden parameters revealed only at ending | Functional/API test |
| Copy | No "PoC", "デモ", "試作" shown in game | Rendered text and source scan |
| Accessibility | Focus, keyboard, contrast and reduced motion | A11y test / manual |
| Release | Owner-only verification before external release | Inspect actual Sites access controls |

## Quality evidence
For every PR report: changed files, scope, screenshot sizes, tested commit, passed/failed tests, unmet acceptance criteria, potential regression, final reviewer decision.

## Before launch
Check the real exhibition Wi-Fi and QR readability on several phones; confirm routing, iPad in stand, idle state, reset timing, and a recovery display in case of network failure.
