# N10 — Fixed Recovery Key Staging Rollback Review (NOT EXECUTABLE)

Status: **Draft PR only. No staging migration has been permitted or applied.**
Target: **MMHVAULT-Auth-Staging** `ldivswlhtgmznzwhzsoi` only.
Do not use on production project `vrypucmyrztxgiqhjspd`.

## Safety and release gates

1. Previously attempted SQL migration was blocked by a safety gate. This document does **not** override that gate and is **not** permission to execute or retry it by another tool.
2. Obtain an approved, auditable Staging migration/rollback pathway and explicit operator authorization **before** any database write.
3. Keep Draft PR #2 unmerged; `RECOVERY_RELEASE_ENABLED=false`; do not change production username signup, MFA, login, financial rows, or DNS.
4. Never use production accounts, passwords, verifier HMAC values, ten-word phrases, decrypted Vault secrets, session tokens, or service-role credentials for Staging QA.
5. Retain separately approved synthetic-only user fixtures and their identifiers. Do not infer that the Staging legacy phrase verifier exists; preflight confirmed it does not.
6. Do not paste or log a plaintext recovery phrase or `vault.decrypted_secrets` content.

## Pre-migration stop conditions

- Verify the database reference from the authorized Supabase project dashboard.
- Capture a read-only `n10_fixed_recovery_READ_ONLY_PREFLIGHT.sql` result and metadata-only inventory of the five RPC signatures, private schema, tables, trigger and Vault extension.
- Inspect schema collision/drift: a pre-existing schema, table, unexpected trigger, conflicting RPC grant, or a non-synthetic Vault secret under the candidate prefix requires **STOP + review**. The reviewed SQL is now deliberately a **first-install-only** transaction (`CREATE SCHEMA`, `CREATE TABLE`, `CREATE FUNCTION`), so a pre-existing object raises a collision error rather than being silently reused or overwritten. Do not bypass this using `IF NOT EXISTS` or `OR REPLACE`.
- Review the RLS/ACL expectations against the actual database role permissions. `SECURITY DEFINER` runs with elevated privileges; only the dedicated backend service-role path may execute key RPCs.
- Obtain a verified rollback window and backup/restore plan *before* attempting the isolated migration.

## Rollback plan after a separately approved Staging-only synthetic test

**The following is an ordered operational checklist, not a SQL script.**

1. Disable the new test Edge endpoint and any QA UI routes to it. Keep the production site untouched.
2. Restrict new access to all five candidate RPCs (backup put/get/exists, rate attempt, active-session) using a reviewed permission change. Verify that no in-flight tests can add secrets.
3. Inventory synthetic-only index rows, Vault secret IDs and counts. **Do not query decrypted phrases.** Confirm every index entry refers only to an approved synthetic Staging account and that no legitimate pre-existing secret has the same name.
4. In an approved transaction, remove only the candidate **synthetic** `mmh_n10_privacy.recovery_backup_index` rows **while the secret cleanup trigger still exists**. Confirm that its trigger removes corresponding `vault.secrets` rows. Never drop the index or private schema first; dropping a table does not fire row-level DELETE triggers.
5. If secret cleanup fails or any orphan Vault secret remains, **STOP**. Do not use `DROP SCHEMA ... CASCADE`, truncate the table, or issue blanket deletes. Triage secret IDs and obtain explicit permission for any targeted cleanup.
6. Only after confirming zero candidate secret rows and zero candidate index rows, remove the five **candidate** public RPCs by exact signatures, then the candidate trigger/helper and private tables; drop the private schema only if it contains no other objects. Do not drop the `vault` schema or `supabase_vault` extension.
7. Clean up separately approved synthetic QA verifier and test auth users **only** through their separately reviewed fixture cleanup process; never delete real accounts, change MFA settings, or modify unrelated RLS policies.
8. Repeat read-only catalog/ACL preflight. Expect private schema and candidate RPCs to be absent again, Vault extension intact, no candidate secrets present. Record the post-rollback Staging counts and production no-change evidence.

## Live acceptance blocked until

- A permitted Staging migration path and synthetic verifier fixture are approved.
- RLS/ACL checks for all five RPCs pass; `anon` and `authenticated` must not execute them, and private tables must not be exposed.
- Real signed-token two-account tests pass (correct/wrong password, AAL1 denied when enrolled, AAL2 permitted, expired/revoked JWT, logout, immutable key, rate limits, account deletion and failed-new-signup compensating cleanup).
- A rollback rehearsal succeeds without orphan Vault secrets and without modifications to production users or financial data.
- A separate explicit owner production-release authorization is recorded.

### Related files

- `docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql` — unreleased migration candidate.
- `docs/sql/n10_fixed_recovery_READ_ONLY_PREFLIGHT.sql` — metadata-only privilege inspection.
- `docs/N10_FIXED_RECOVERY_VAULT_RELEASE_GATE_20261031.md` — acceptance matrix.

**No writes to Staging or production were made while authoring this review.**
