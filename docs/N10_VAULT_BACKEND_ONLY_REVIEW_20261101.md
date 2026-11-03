# N10 fixed-recovery Vault — backend-only review candidate (no deployment)

**Date: 2026-11-01. Status: DRAFT / CLOSED / REVIEW-ONLY. This code has NOT been deployed or authorized to run.**

## Why this branch exists
Original [PR #2](https://github.com/myintmoehein0115024/MMHVAULT/pull/2) contains 163 cumulative Draft commits, 27 changed files and is technically merge-conflicted with `main`. It combines unfinished Vault UI, older Login changes, QA tooling and backend materials. Those parts **must not be bulk merged**. [PR #9](https://github.com/myintmoehein0115024/MMHVAULT/pull/9) already isolates MFA-only hardening and is a separate, unmerged Draft.

This new `review/n10-vault-backend-only-20261101` branch starts from production `main` SHA `d9e61e96d9ea30f1296d81594f87275179c85c3e` and **copies only independently reviewable, disabled backend code** from PR #2 without conflict-prone `login.html` or `js/mmhvault-n10-a7-83-security-center.js`.

## Included in review — not installed
- `security/n10-fixed-recovery-vault-candidate/index.ts`: production-project-pinned, `RECOVERY_RELEASE_ENABLED=false`. This is **not** the deployed Edge service.
- `mfa-assurance.mjs`, `session-guard.mjs`: support helpers.
- `test-mfa-assurance.mjs`, `test-session-guard.mjs` and `test-backend-only-review.mjs`: offline/synthetic contracts, no signed real session.
- `docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql`: **NOT AUTHORIZED TO RUN**. Contains real DDL and potential Vault functions; it must not be run in Staging or production without a future, specific approval and deletion/rollback audit.
- `docs/sql/n10_fixed_recovery_READ_ONLY_PREFLIGHT.sql`: SELECT-only audit candidate, not evidence that the migration has been deployed.
- `.github/workflows/n10-vault-backend-only-review.yml`: branch-only offline checks; no deploy, no database connections, no Auth credentials.

**Explicitly excluded:** original PR #2 `login.html`, security center UI, fixed-recovery UI toggle, username signup integration, retired/standalone QA service code, expired QA page/whitelist, production App, Landing, Accounts FX, financial data, production Secrets and DNS. No new QA route or alternate activation of a previously blocked QA test.

## Gate status
1. **MFA signed Staging QA acceptance:** the latest metadata-only DB audit found **one verified and one unverified TOTP factor**, plus six historical AAL2 sessions belonging to one user. This does **not** establish two new signed synthetic QA accounts, A/B isolation, or end-to-end live recovery testing. The original QA page remains LOCKED/expired and reactivation was safety-denied. **No bypass through this branch**.
2. **Vault / RLS / crypto / deletion:** true authenticated AAL1 denial, AAL2 allow, password, original ten-word verifier, encrypted backup and reveal, signed session revocation, row-level owner isolation and Vault orphan-free deletion remain **UNTESTED** in actual Staging. A pass from CI is not evidence of these runtime properties. Historical SQL cleanup assertions must be reviewed and verified by an authorized audit authority.
3. **Release:** a future migration and Edge deployment would require an independently approved test and rollback plan, and user approval separate from any MFA-only release. `RECOVERY_RELEASE_ENABLED=false` must remain OFF until those conditions are fulfilled.

This branch's only purpose is to avoid a Git code-conflict dependency while preserving a smaller source bundle for scrutiny. It does **not** solve the real MFA or Vault E2E release blockers, and must remain **Draft/unmerged**. The old PR #2 must stay unmerged and must not be closed automatically.


## Installed Auth-Staging drift and guard V2 plan (November 1)
The Auth-Staging project `ldivswlhtgmznzwhzsoi` already contains the Vault private tables and original **two-argument** `mmh_n10_recovery_session_active(uuid,uuid)` RPC, with no new three-argument AAL-bound RPC. No signed production/QA deployment is authorized. **Never run the first-install SQL on this existing schema.**

Review-only files `docs/sql/n10_staging_session_guard_V2_UPGRADE_REVIEW_ONLY.sql` and `docs/sql/n10_staging_session_guard_V2_EMERGENCY_DISABLE_REVIEW_ONLY.sql` prepare a separately authorized transaction-atomic retirement of the weaker guard and a fail-closed emergency option; neither file has been executed. The upgrade aborts for source-hash drift, ACL mismatches, schema drift, installed V2, or dependencies, and restricts V2 execution to service_role. Actual external Edge RPC callers cannot be ruled out by catalog dependency checks; a separately approved caller review and rollback test are mandatory.

The latest installed-data snapshot showed zero N10 Vault secrets/backup rows and zero unlinked N10 ciphertexts. It proves **only current emptiness**, not successful deletion. Staging rate buckets were manually pruned and a daily cleanup job is configured; its first scheduled execution was not yet verified. The **first-install candidate** remains separate and still has no built-in cleanup job.

CI validates only syntax/type checks and offline source contracts. Separate owner-authorized signed-token and account-deletion acceptance are still required before production decisions.
