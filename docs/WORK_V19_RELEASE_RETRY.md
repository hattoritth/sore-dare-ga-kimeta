# Work instructions: authorized v19 release retry

This is an execution note for the already authorized v19 release only. This note is paired with the guardrails branch and does not alter the pinned v19 release commit. Follow [the Sites release playbook](SITES_RELEASE_PLAYBOOK.md) as the single SOP. Do not infer that this note approves a backup-policy exception.

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
3. Obtain a new complete D1 backup and verify it is complete and restorable. If the full row export is truncated, once check an officially supported alternate export or chunked SQL path as documented in the playbook. Do not invent tool support or infer completeness from a row count of one.
4. If a complete current backup cannot be read and validated, stop immediately as `CAPABILITY_BLOCKED` under the current mandatory gate. Report that the v19 release remains unpublished and present the proposed R0 risk-based exception once for the user's separate decision. Do not apply the exception in this run without explicit approval.
5. If and only if every active GO gate passes, execute the already authorized release against this exact existing Site, then reread the saved/deployed version and public URL. Verify Worker SHA, `/app.js` SHA, health and pre/post D1 row count/version/checksum without exposing row contents. On mismatch or unhealthy status, use the approved prior-version rollback and verify it.

No GitHub main merge is required. This note does not state that v19 has been published; report the observed outcome and remaining unverified items precisely.
