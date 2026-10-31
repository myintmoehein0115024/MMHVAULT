# N10 Fixed Recovery — Staging SQL Execution & Read-Only Acceptance Record

**Date:** 2026-10-31 (UTC timestamps as recorded by Supabase)

## Locked QA Edge deployment update (after the SQL migration)

Following the owner's explicit approval to create two new synthetic accounts and deploy a temporary Staging-only QA service, a **new** Edge function `mmh-n10-fixed-vault-qa-locked` was deployed **only** to Staging project `ldivswlhtgmznzwhzsoi`.
- Deployment ID `5d208de0-c91f-4c49-b55e-1aab6fa43e0b`, version 1, ACTIVE, `verify_jwt=true`.
- It exactly matches the Draft PR's reviewed Staging adapter source (blob `8313a51480610ba27a285208a415c0b747a243b7`) and two matching MFA/session helper files; deployed contents were fetched back and compared byte-for-byte.
- Critically, `RECOVERY_RELEASE_ENABLED=false` remains in the deployed code, the Staging project URL is exact-pinned, the allowed origin is GitHub QA only, and a separate secret plus two explicitly approved synthetic UIDs are required before runtime use. **No plaintext recovery feature is enabled.**
- After deployment, read-only counts remained **2 older Staging-only QA accounts, 0 newly provisioned users, 0 fixed-recovery verifier rows, 0 Vault backup rows and 0 candidate-prefix Vault secrets**.
- This connector offers Edge deployment and read-only inventory but **no Auth Admin user creation** or authenticated invocation. Do not create Auth users by directly inserting into `auth.users` via SQL or via dangerous unauthenticated creation code. Two new synthetic accounts still require a controlled Auth Admin creation or independently verified Staging QA signup; no such account creation has been claimed. User passwords, JWTs, original ten words and TOTP secrets must not appear in chat or logs.
- **No CI/Deno live JWT QA has passed** from this deployment. Function ACTIVE means deployed, not end-to-end approved.
- This update supersedes earlier statement below that no QA Edge had been deployed; the record is historical and preserves the exact order.
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

## Two confirmed QA users and locked service update (2026-10-31)

After the owner manually created the two dedicated, newly generated-email synthetic users in **Auth Staging** only, a read-only Auth query confirmed:

- Account A (verified email) UID: `bbfa4e52-2ad0-4c8f-a635-6bdcd89b6990`.
- Account B (verified email) UID: `bda2b4a3-ffab-4b00-883b-8a31bb1c6129`.
- Both have distinct Auth IDs and `email_confirmed_at` populated, are non-anonymous and intentionally have **no** username-only `app_metadata`. Their passwords were never sent to the assistant.
- Their IDs/email are hard-pinned as an exact pair in the Staging-only QA adapter, rather than modifying Auth-owned metadata, inserting directly into `auth.users`, or reusing existing username-only legacy QA users. The adapter rejects anything except the exact UID/email combination and requires verified email plus signed JWT/MFA.

The existing Staging QA Edge `mmh-n10-fixed-vault-qa-locked` was updated to **version 2**, `verify_jwt=true`, with the exact A/B bindings and **RECOVERY_RELEASE_ENABLED=false**; source verified via GitHub. A separately reviewed **new** candidate change adds `qa_initialize`, generating random 10-word synthetic verifier phrases after signed Auth, MFA, live-session and fresh password proof; it is **not yet deployed or enabled**.

New independent public QA page in the independent **MMHVAULT-Auth-QA** GitHub Pages repository: `n10-fixed-vault-qa.html`. It only uses the public Staging publishable key; passwords/JWTs/words remain in memory with 45-second word expiry and no local/session storage. It offers browser-generated random 256-bit HMAC Secret copy, with no secret emitted to ChatGPT. The page is NOT a production login route and cannot unlock the QA service on its own.

Updated backend **30/30 static source security-contract checks** passed in a restricted JS harness. This is not actual Deno compilation or signed-JWT/MFA/Vault end-to-end testing.

**Next prerequisite:** operator sets a new, unrelated Staging-only Edge Secret named `N10_FIXED_RECOVERY_QA_HMAC_KEY` using the browser-generated random value; no production key may be used. Then review and deploy the updated initializer source while initially keeping the release switch OFF; activate only the two explicit QA accounts under a controlled test window, validate signed scenarios and promptly turn OFF and clean all synthetic records. The existing A/B users and all related records must be removed only by an authorized cleanup after tests.

**No additional Auth mutations** beyond the user's own creation of A/B; no verifier rows, Vault secrets or financial records were added by this preparation work. Production stays unchanged.
