# Sites release stalls: v17–v19

This incident record contains operational facts and corrective actions only. It contains no production row contents, personal identifiers, credentials, cookies, or private export data.

## Timeline

- **v17:** Release work repeatedly stalled on obtaining a pending migrations count. The official Sites environment did not expose a native pending-migrations read command in the available Work tooling.
- **v18:** Work stalled while trying to inspect a database warning/internal migration plan, then requested Google login without a demonstrated dependency. The release added avoidable checks despite an authorized alternative procedure for unchanged database behavior; the complete backup requirement remained mandatory.
- **v19:** The official Sites database read returned a truncated `city_state_stage4.json` full-row value. It contained only one row, but truncation meant a complete, restorable current D1 backup could not be proven. The v19 UI-only release attempt therefore could not pass the existing backup gate.
- **v18→v19 source evidence:** commit `e593e691957c29840d3aff168a83843aebc18518` to `3b977ea22019046559e1c7304b0d2d0a99ffe7c2` changes no Worker, schema, engine, migration, or hosting manifest source. This is path-diff evidence only; it does not prove Sites platform auto-migrations are absent.

## Root cause

The procedure did not front-load a bounded capability check for official Sites tools, did not provide a supported recovery path for a truncated D1 row, and allowed repeated attempts to find unsupported migration visibility. The v19 handoff also required a new complete current backup for every UI-only release, making unavailable export capability an operational deadlock. The backup condition itself is still the active policy and must not be silently waived.

## Durable changes

- `docs/SITES_RELEASE_PLAYBOOK.md` is the single release SOP. It defines tool capability checks first, R0/R1/R2 gates, fail-closed behavior, backup policy, postpublish verification, and rollback.
- `site/scripts/sites-release-preflight.mjs` provides conservative path-based classification. It cannot certify a backup, runtime behavior, platform state, or publish approval.
- `site/scripts/verify-d1-chunks.mjs` validates byte coverage and reconstructs a private JSON row when an authorized Work tool can actually provide stable-version chunks. It cannot recover bytes omitted by a truncated export.
- A risk-based relaxation for R0 is recorded as a **proposal only**: previously verified restorable backup, no DB-impacting source diff, pre/post row count and version/checksum where available, and a separate explicit user approval. Until that approval, fresh complete backup remains mandatory for R0. R1/R2 never use this relaxation.
- Google authentication is not requested unless a specific required official operation proves it depends on that login.

## Evidence and remaining limit

The v18→v19 source comparison and current manifest can be checked locally without production access. No production D1 was read or changed in creating these guardrails. Whether the official Work interface supports full exports, SQL chunk reads, or postpublish D1 checks is an environment capability to confirm at the start of a release; if no supported complete backup path exists, report `CAPABILITY_BLOCKED` and stop under the active policy.
