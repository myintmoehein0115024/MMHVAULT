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

## Staging QA Secret confirmed; controlled A/B activation (2026-10-31, UTC)

Owner supplied screenshots showing the randomly generated 256-bit `N10_FIXED_RECOVERY_QA_HMAC_KEY` was saved to **MMHVAULT-Auth-Staging → Edge Functions → Secrets**. No secret value was copied into the repository or chat. This was a direct owner action; the connector does not provide a read-back of the secret itself.

The approved fixed-recovery Staging-only Edge function `mmh-n10-fixed-vault-qa-locked` was first redeployed as version 4 with the **`qa_initialize`** CSPRNG 10-word synthetic-only initializer but `RECOVERY_RELEASE_ENABLED=false`. The exact deployed code and component files were read back.

Following the owner's earlier explicit authorization for two-account signed-JWT/Vault QA and the Secret confirmation, version **5** was deployed solely to Staging `ldivswlhtgmznzwhzsoi` using a *runtime-only* patch of the reviewed GitHub Draft QA candidate: `RECOVERY_RELEASE_ENABLED=true` plus a hard-coded absolute **expiry guard `Date.now()>=Date.parse('2026-10-31T17:05:00.000Z')`**, returning `qa_window_closed` (503) for any actions after that time. This is equivalent to **2026-11-01 00:05 Thailand time**. The GitHub Draft QA source itself remains `RECOVERY_RELEASE_ENABLED=false`; there is no production enabled flag.

Read-back from Supabase verified: deployed Edge ID `5d208de0-c91f-4c49-b55e-1aab6fa43e0b`, version 5, `verify_jwt=true`; exact Staging base and QA-only GitHub origin; exact verified Auth UID + email pair for A/B; runtime true flag and automatic expiry guard present. Non-whitelisted accounts cannot pass `verifiedUser`, and password proof, live session, server-managed MFA factors and shared quota must pass. The deployment was not made to production.

Read-only database counts immediately after activation: **0 new verifier rows, 0 Vault backup index rows, 0 candidate-prefix Vault secrets**. This is **not** proof of a working Vault encryption/backup flow. User must now log into A on the independent QA page and test initialization, encrypted backup, reveal and B separation. No credentials/tokens/words should be pasted into the chat.

**Important remaining cleanup:** The time guard automatically blocks actions after expiry, but it does **not delete the Staging Edge function or the two synthetic Auth users.** Those need explicit verified cleanup with the authorized tools after tests; do not claim background deletion or rollback. The original production auth/financial system remains unchanged. N10 production rollout and V11 are still deferred.

## 2026-11-01 — Recovery QA service retired; isolated TOTP AAL test UI prepared

After the synthetic A/B recovery tests and owner-led cleanup, a read-only Staging Auth account lookup confirmed both newly created A/B users absent. A read-only MFA factor aggregate query found the **two older Staging username-only QA users had zero MFA factor records**; the earlier A/B synthetic users also had no MFA factors during their run. Therefore the N10 **enrolled AAL1-deny / AAL2-allow gate remains untested**.

To reduce residual exposure, the previously disabled Staging fixed-recovery function `mmh-n10-fixed-vault-qa-locked` (ID `5d208de0-c91f-4c49-b55e-1aab6fa43e0b`) was redeployed as **v8** with source `security/n10-fixed-recovery-vault-candidate/qa-retired-tombstone-STAGING.ts`: a tiny HTTP **410** `qa_retired` stub, retaining `verify_jwt=true`, no user lookup, Auth admin, Vault, service secrets, RPC calls, CORS, recovery logic, or test keys. Remote source was fetched and confirmed exactly equal to the reviewed Draft tombstone. The Edge deployment remains ACTIVE in the management listing, but has no operational backup/reveal functionality; no deletion of the Edge deployment is claimed.

An independent, single-purpose Auth QA page `myintmoehein0115024/MMHVAULT-Auth-QA/n10-mfa-aal-qa.html` was prepared to use a **new** synthetic identity `n10-mfa-qa-20261101@no-mail.mmhvault.invalid` only, without modifying older QA users. It includes an in-memory-only password sign-in, TOTP enrollment/verification, re-login to test **AAL1 MUST return 403/MFA_REQUIRED**, then TOTP escalation to AAL2 where the independent existing `mmh-n10-qa-edge-mfa-20261031` should return **200/MFA_ALLOWED**. Source uses pinned supabase-js 2.57.4, public project publishable key only, no locally persisted session or private service keys. Script parse/static checks passed; **live MFA tests have not occurred**. One dedicated new synthetic Staging Auth user must be created by the owner via Auth Admin UI before attempting this test.

Backend static security contracts now include the retired 410-only endpoint (**31/31 assertions passed in isolated JS source harness**). GitHub offline CI checks the tombstone's Deno file too; actual Deno/GitHub Actions results for the new head were not independently confirmed here.

**Remaining release blockers:** TOTP-enrolled AAL1/AAL2 signed acceptance; Vault orphan-free cleanup evidence blocked by the earlier tool safety check (must not bypass); explicit review of remaining Staging QA assets and separate production N10 authorization. Neither N10 production nor V11 has been enabled.

## N10 supplemental read-only structural audit and production-project pin

- Following the owner-completed synthetic A/B and TOTP QA cleanup, read-only **Staging pg_catalog metadata** independently confirmed:
  1. `mmh_n10_privacy.mmh_n10_recovery_secret_gc` exists, is **enabled**, and is `AFTER DELETE ON mmh_n10_privacy.recovery_backup_index FOR EACH ROW`, executing `mmh_n10_privacy.cleanup_recovery_vault_secret()`.
  2. `mmh_n10_privacy.recovery_backup_index.user_id` and `public.mmh_n10a769_recovery_phrases.user_id` both have FK `REFERENCES auth.users(id) ON DELETE CASCADE`.
  3. The reviewed migration source for the cleanup function executes `DELETE FROM vault.secrets WHERE id=OLD.secret_id`, but the actual decryption/secret catalog after test-user removal has **NOT** been inspected and **must not** be treated as proven clean. A preceding direct sensitive Vault records query was blocked; do not route around the safety control. **Orphan-free deletion remains UNVERIFIED.**
- Staging Supabase security advisor shows:
  - `rls_enabled_no_policy` INFO for a set of intentional deny-by-default tables, including private recovery tables; not evidence of public access.
  - `authenticated_security_definer_function_executable` WARN on existing `public.mmh_n10_qa_privileged_read`. Its function definition was inspected read-only: it verifies `auth.uid() = p_expected_uid` and `mmh_n10_qa_security.mfa_ok()` before returning a **boolean existence** check. It is related to older signed QA; **left unchanged** to avoid breaking other tests. Not a blanket assurance of safety.
  - `auth_leaked_password_protection` WARN: leaked-password protection disabled in this Staging Auth project. Consult [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) before release; Staging settings were not modified.
- Draft-only production recovery Edge candidate `security/n10-fixed-recovery-vault-candidate/index.ts` was tightened: `EXPECTED_BASE='https://vrypucmyrztxgiqhjspd.supabase.co'` is now checked **exactly** (instead of allowing any HTTPS Supabase project with a guessed origin); `ORIGIN='https://mmhvault.com'` fixed. Separate Auth-Staging QA adapter remains independent. The candidate is still hard `RECOVERY_RELEASE_ENABLED=false`, and no deployment to production occurred.
- Added static CI assertion enforcing this production project pin and disabled release. Restricted local pure-JS test harness re-ran **32/32 security-contract checks PASS** on the Draft's updated GitHub source; neither live GitHub Actions CI outcome nor Deno typecheck has been independently verified.

**Remaining hard production N10 gates:** independently authorized proof of Vault post-user-deletion cleanup (without bypassing denied sensitive query); signed MFA AAL1-denied/AAL2-allowed tested against **the exact fixed-recovery backup/reveal service** rather than just the isolated MFA checker; release authorization and rollback readiness. Current Draft PR must not be merged before these gates.

## N10 Draft-only MFA stale-AAL2 fail-closed hardening

- Modified `security/n10-fixed-recovery-vault-candidate/mfa-assurance.mjs` so a **stale AAL2 JWT claim without any currently verified MFA factor** returns `unavailable` rather than being accepted for sensitive recovery-key access. Ordinary AAL1 sessions without enrolled factors stay valid; enrolled AAL1 still returns `required`, enrolled AAL2 still `allowed`.
- Updated `test-mfa-assurance.mjs` to require that stale AAL2 state to fail closed. A local, restricted JS simulation of decoded JWT claims passed **10/10 scenarios**, including no-factor AAL1, verified-factor AAL1 denial, AAL2 allow, stale AAL2 after factor removal, expired/mismatched identity/issuer, and malformed assurance. **Not signed-JWT, Vault or live backend acceptance**.
- Only Draft PR #2 was edited. Runtime QA remains retired, production unchanged. Exact-service MFA + Vault E2E and Vault orphan-free deletion still release blockers.
