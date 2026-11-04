# Work instructions: authorized v19 release retry

This is an execution note for the already authorized v19 release only. This note is paired with the guardrails branch and does not alter the pinned v19 release commit. Follow [the Sites release playbook](SITES_RELEASE_PLAYBOOK.md) as the single SOP. The user expressly authorized the scoped R0 backup exception on 2026-11-04; see SITES_RELEASE_POLICY_DECISION_20261104.md. Do not extend it to DB-impacting changes.

## Pinned target

- Existing Site project: `appgprj_6ae596548c00819189f3f54ce3275e02`
- Existing public URL: <https://machi-no-tsuzuki-20261031.tthkpba.chatgpt.site/>
- Release: PR19, source commit `3b977ea22019046559e1c7304b0d2d0a99ffe7c2`
- Expected Worker SHA-256: `b8feb21a306421dcc02ac3a4072ae14ad480a3f697a883416691c7da6e8cc87d`
- Expected `/app.js` SHA-256: `25fdca5e8cc69681396f7c01fafb3cbb496bd9eac92cae1a63fd2e122b3c4c3a`
- Expected manifest: project ID above, D1 binding `DB`, R2 `null`.

## Run

1. At the start, list which official operations are available: select existing Site, inspect exact source/Worker/assets, full D1 backup/export or read-only SQL, save version, publish, and reread status/URL/health. Do not spend time seeking a native pending-migrations count; Work previously had no such read command. Do not request Google login unless a specific required operation proves it is necessary.
2. Confirm the exact pinned commit and Worker and `/app.js` hashes in the official source. Confirm no unapproved source/manifest changes and preserve existing Site ID, URL, audience, DB binding and rows.
3. Prefer a **new full current D1 backup** and restore verification. The last Work report established `city_state` 1 row complete and `city_state_stage4` 1 row but JSON output truncated. **Do not repeat the failed full-row read indefinitely.** Once check whether official full export/read-only SQL chunks are actually supported. If unsupported, record `CAPABILITY_BLOCKED` for fresh backup and apply the previously approved **R0-only alternative** below rather than requesting Google login or stopping solely due to truncation.
4. R0 alternative (approved; no repeat approval): confirm v18's **complete, untruncated, previously restore-verified baseline backup** for both tables is still available and protected; compare the v18→v19 source refs for no Worker API, engine, SQL/schema/migrations, hosting manifest or binding modifications; confirm same site ID, URL, D1 `DB`; read current row counts, IDs and versions where supported, and record baseline; preserve source-derived-DDL/live-DDL limitation. If any mandatory element fails, stop with the exact missing evidence (not a generic missing-SQL claim). This exception accepts loss of DB changes since baseline and unknown internal Sites migration risk.
5. With all R0 gates passed, create a new v19 Site source commit/save based only on the pinned v19 source and matching Worker SHA, then **publish the existing Site**. New Sites version and deploy ID must be actually returned. After publish verify source/Worker/hash, public `/app.js`, /api/health `storage:true`, and both D1 row counts/IDs/version where accessible. Do not claim complete data equality when JSON is truncated. If unexpected discrepancy, stop writes, capture facts, and seek a separately approved recovery plan; Sites version rollback does not restore D1.

No GitHub main merge is required. This note does not state that v19 has been published; report the observed outcome and remaining unverified items precisely.
