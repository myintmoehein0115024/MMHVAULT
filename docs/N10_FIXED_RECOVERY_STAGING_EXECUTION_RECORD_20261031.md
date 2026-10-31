# N10 Fixed Recovery — Staging SQL Execution & Read-Only Acceptance Record

**Date:** 2026-10-31 (UTC timestamps as recorded by Supabase)
**Scope:** MMHVAULT Auth Staging project `ldivswlhtgmznzwhzsoi` **only**.
**Production project `vrypucmyrztxgiqhjspd`: NOT modified.**
**Authorization:** The owner approved only a normal, auditable Staging migration attempt through the existing gate. Prior instructions to stop if blocked and not bypass via another write path were retained.

## Authorized changes actually applied

Exactly two reviewed GitHub SQL files were submitted individually via the connected Supabase **apply_migration** action to the Staging project; both returned `success: true`.

1. Migration `20261031155428`, name `n10_fixed_recovery_synthetic_verifier_staging_20261031`.
   - Source: `docs/sql/n10_fixed_recovery_verifier_SYNTHETIC_STAGING_ONLY.sql`.
   - Verified source blob SHA: `9f86f7ef152145b7ed8b4ecbcc31461728fdfcf7`.
   - Adds the empty, test-only `public.mmh_n10a769_recovery_phrases` table; RLS enabled; `anon` and `authenticated` cannot SELECT; service-role receives selected CRUD permissions. **No test rows inserted.**
2. Migration `20261031155456`, name `n10_fixed_recovery_vault_private_schema_staging_20261031`.
   - Source: `docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql`.
   - Verified source blob SHA: `04c538e0f0d015b04dc8f0dcabacda37f38f6814`.
   - Adds `mmh_n10_privacy` with private recovery index/rate bucket and Vault secret cleanup trigger; five service-role-only recovery RPCs and a private helper. Explicit first-install-only SQL, no `IF NOT EXISTS` or `OR REPLACE`.
   - **No user records, secrets, plaintext recovery words, sessions or financial rows changed.**

The original migration safety gate did **not** reject these authorized `apply_migration` submissions. No alternate SQL write interface or bypass was used.

## Read-only post-migration checks — PASS (structural only)

- Both migrations appear in Supabase Staging migration history with the exact versions above.
- `supabase_vault` present, `vault.create_secret(text,text,text,uuid)` available, `auth.sessions.not_after` present.
- Private schema, both private tables, Staging verifier, all five public RPCs and the private cleanup helper now exist.
- Verifier, recovery index and recovery rate-bucket tables all have RLS enabled.
- `anon` and `authenticated` have no SELECT on the verifier; neither role has EXECUTE on the five recovery RPCs or USAGE on `mmh_n10_privacy`.
- `service_role` has EXECUTE on the five public RPCs; the private cleanup helper has no service-role EXECUTE.
- All six functions have `SECURITY DEFINER` with restricted `search_path`. Elevated execution remains restricted to privileged backend paths.
- Vault cleanup trigger `mmh_n10_recovery_secret_gc` exists and is enabled. **Its deletion behavior has NOT been exercised yet.**
- Inventory immediately after migration: **0 verifier rows; 0 recovery backup index rows; 0 rate-limit rows; 0 Vault secrets using the candidate prefix**.
- Non-mutating smoke calls of `backup_exists(zero_uuid)` and `session_active(zero_uuid,zero_uuid)` returned `false` as expected.
- Read-only production check: private schema, recovery `backup_put` and `backup_get` RPCs remain absent from the production project.

## Security advisor baseline

- No newly reported publicly executable fixed-recovery `SECURITY DEFINER` RPCs.
- Existing Staging-only WARN remains: `public.mmh_n10_qa_privileged_read(uuid)` is `SECURITY DEFINER` callable by `authenticated`; it checks `auth.uid()` and MFA and was **not** modified.
- Existing Auth WARN: leaked-password protection disabled; no Auth setting was modified.
- `RLS enabled no policy` INFO findings include private internal tables and the synthetic-only verifier; the intentional no-browser ACLs are verified separately.

## Next release gates — NOT TESTED / DO NOT CLAIM N10 COMPLETE

1. New synthetic-only accounts and verifier HMAC setup using **Staging-only** credentials and secret, never production credentials/recovery words. User must separately authorize synthetic account/Edge test mutations.
2. Staging-specific signed-JWT backend deployment with the release flags gated; no production-host-pinned signup code used as-is.
3. Real two-account test of correct/wrong passwords, MFA AAL1/AAL2, enrollment change, logout/revocation, owner separation, retries/rate limits, immutable backup, 45-second UI hiding.
4. Prove Vault encryption writes, plaintext reveal restrictions, trigger cleanup on user deletion and orphan-free rollback using synthetic rows only.
5. After test, audit RLS/ACL again, remove/retire unnecessary QA permissions with authorization, verify rollback and production no-change evidence.
6. Separate explicit owner approval for production N10 release; only then consider V11.

**Release state:** `RECOVERY_RELEASE_ENABLED=false`, signup candidate `RELEASE_ENABLED=false`, GitHub PR #2 Draft/unmerged. No new Edge function deployed; N10 not yet signed off. V11 planning-only.

## History note

Earlier release-gate and rollback documents said the Staging schema was absent and migrations unexecuted. Those statements described the **pre-authorization state**; this execution record supersedes that status as of 2026-10-31. Do not repeat the earlier blocked status as if it were still current.

## Subsequent Staging QA preparation — not a deployment

Read-only account-aggregate inspection: **2** existing legacy synthetic username-only Staging users and **2** corresponding old verifier records exist; **0** new `mmh_n10a769_recovery_phrases` records were present. Old QA users use the Auth-owned `username_only_staging` kind, while the production recovery candidate requires `username_only`. Their old verifier HMAC namespace/table is different from the new Vault candidate. **No existing original words were recovered, rotated, copied or overwritten.**

A separate review-only Edge candidate `security/n10-fixed-recovery-vault-candidate/qa-staging-recovery-NOT_DEPLOYED.ts` was added. It is hard-pinned to Staging project `ldivswlhtgmznzwhzsoi`, QA GitHub origin, and a pair of explicit synthetic user UUIDs; requires `qa_` usernames, `username_only_staging` Auth-owned metadata, a separate Staging HMAC key, and keeps the release flag OFF. The candidate has **not** been deployed or invoked and must not be treated as working live recovery. A new offline contract covers its isolation controls (29/29 backend static checks in a restricted source harness; NOT signed-JWT or Deno compilation).

See `docs/N10_FIXED_RECOVERY_STAGING_SIGNED_JWT_QA_PLAN_20261031.md` for separate permission, account setup, session/MFA matrix and cleanup. This work did **not** create additional Auth users or recovery secrets or modify Staging SQL, production or V11.
