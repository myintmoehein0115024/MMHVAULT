# N10 Fixed 10-word Recovery Key — implementation and release gate
Date: 2026-10-31 · Development branch only, NOT a live backup service.

## Owner requirement
Each username-only account retains one fixed original ten-word key. A password prompt plus an authenticated AAL2 session (if TOTP enrolled) should allow secure re-view of the **same** phrase and locally reconstructed QR, not rotation.

## Successfully released frontend (GitHub main)
- `login.html` — Use Recovery Key on left / Forgot password? on right. Main commit `45fc5183e30cf82d82d5d810e4f79f283c6d5734`.
- `js/mmhvault-n10-a7-83-security-center.js` — Username, Recovery, Google and Authenticator detail sections now open modal overlays. Main commit `0d94cd34ea96eda6cc3c525534385ccb4b93bde3`.
- Pre-change main snapshot: branch `backup/n10-before-security-modal-20261031`.

## Implemented but NOT DEPLOYED
- `docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql`: private-schema index, encrypted Supabase Vault secret storage, immutable key replacement protection, privileged service-role-only RPCs, access throttling, delete cleanup.
- `security/n10-fixed-recovery-vault-candidate/index.ts`: verified JWT + server-side TOTP factors, password re-auth via isolated ephemeral session, original-phrase verifier cross-check, existing-key Vault store and password-protected reveal.
- `security/n10-fixed-recovery-vault-candidate/username-signup-integration-NOT_DEPLOYED.ts`: automatically escrow original generated phrase before completing new username signup; refuses incomplete signup if Vault backup fails.
- Candidate UI changes in development branch: existing-account one-time encrypted escrow with original phrase + password; later reveal with password only (TOTP-bound accounts must already be AAL2); secrets auto-hide in 45 seconds.

## Deployment blockers (MUST resolve)
1. The Staging SQL migration invocation was rejected by the execution safety gate, so **no migration was applied**. Do not work around the block by retrying through a different write interface; obtain a safe approved execution path.
2. Current auth Staging lacks the production `mmh_n10a769_recovery_phrases` table and production signup runtime. Prepare isolated QA rather than copying real recovery data.
3. No signed JWT / real password / error-path QA for this new Vault service. Static source checks are not substitutes for live acceptance.
4. Production permissions, Vault secret deletion, dual-login testing, enrollment/rollback and newly registered user backup must all be verified before deployment.
5. A one-way verifier cannot recreate a lost original key. Previously registered users must enter their original ten words **once** to opt into encrypted backup. A user who has already lost the original phrase cannot be shown that same phrase unless it was previously escrowed.
6. Encryption makes the original recovery key retrievable to authorized backend service code and privileged database operators. This is a deliberate confidentiality tradeoff versus the previous verifier-only design. Apply strict monitoring, no secret logging, MFA assurance, and narrowly granted roles.

## QA acceptance matrix
- Unenrolled user AAL1 + password -> original phrase only after Vault backup.
- Enrolled MFA AAL1 -> REST/Edge denied, even with correct password.
- Enrolled MFA AAL2 + correct password -> original ten words only; returned in no-store response; QR only in local browser.
- Wrong password, wrong words, expired JWT, mismatched UID, missing server factors -> no key returned; rate limits enforce 5 attempts / 15 minutes.
- Repeat backup same phrase -> idempotent; different phrase -> reject and retain original.
- Password change -> the escrowed phrase remains the SAME (Vault key independent from login password).
- Close modal, log out, navigate away or wait 45 seconds -> clear plaintext display and inputs.
- Owner deletes account -> Vault secret cleaned up with index.
- RLS and Vault permission audit: anon and authenticated execute privileges false; new private tables not in exposed public inventory.
- New username signup -> original recovery phrase is escrowed before reporting success. **Auth account creation and Vault SQL are not one cross-system transaction**; verify compensating delete, orphan detection, and alarm paths under simulated failures before rollout.
- Existing finance counts, transactions, receipts, RLS and DNS unchanged.

## Operational restrictions
No production SQL, financial rows, auth account record, MFA enrollment, or live Edge function changed as part of the Vault candidate.
Do not ask the owner to paste recovery words, passwords, TOTP setup QR or bearer tokens into chat.
Draft PR only: **do not merge until the full database and signed-token tests pass**.

## 2026-10-31 read-only safety inspection and candidate hardening
- Staging project `ldivswlhtgmznzwhzsoi`: `supabase_vault` extension and `vault` schema are present. The `mmh_n10_privacy` private schema, `mmh_n10_recovery_backup_put/get` functions, and `mmh_n10a769_recovery_phrases` verifier table are **NOT present**. No migration was run or retried.
- Draft UI added an epoch + owner + visible-modal guard. If a slow request returns after modal close, tab hidden, account switch, or sign-out, its phrase/status response is discarded instead of displaying in a reopened screen. Hidden/closed screens clear password and words.
- Undeployed new-signup candidate has `RELEASE_ENABLED=false` by default. No signup switch or production Edge function was changed.
- Offline synthetic MFA test file `security/n10-fixed-recovery-vault-candidate/test-mfa-assurance.mjs`: 14 negative/positive logical cases (expiry, issuer, UID, missing factor, AAL1 vs AAL2, anonymous user, malformed JWT). Test credentials and JWT payloads are synthetic, not valid signed tokens.
- **Do not report Vault/recovery feature live or fully verified.** Database encryption, correct user-to-secret binding, server-side token verification, real MFA, wrong-password denial, rate limits, lost-original-phrase behavior, and account deletion have NOT passed Staging end-to-end QA.
- A one-way verifier cannot restore the original words for an old account which has already lost its only saved copy; never claim a password alone can reconstruct previously unescrowed words.
- The previous Staging SQL write was rejected by a safety gate. Do not circumvent with an alternate write interface; use an authorized, reviewable path before any sandbox migration. Keep PR in draft.

## N10 safety hardening + executed synthetic QA (2026-10-31, second pass)
- The **undeployed** Vault Edge candidate has an explicit compile-time `RECOVERY_RELEASE_ENABLED=false` gate. This is a safety default; a production release requires a separate reviewed change and end-to-end signed-JWT tests.
- Recovery Edge JSON input is limited to **1,200 bytes while streaming**, even when content-length is missing. Invalid/oversized bodies fail closed. Password input for username-only accounts is limited to 6–20 characters.
- Recovery throttling buckets are derived with server-side keyed HMAC, not plain SHA-256. A backend rate-infrastructure error returns `rate_unavailable` (503), not a misleading `too_many_attempts` (429).
- Account switch and sign-out now invalidate pending recovery-key fetches synchronously, in addition to the previously added popup-close, hidden-tab and epoch/owner checks.
- The checked-in MFA logic file and its offline synthetic test file were copied byte-for-byte into a local Node.js 22.16.0 runtime, verified against their GitHub blob SHAs (`1bbcae6ddc7ae0eb6c2e966397d44b172b53c5ac`, `1df73410f89c2f49bd3b2a40959dcebbb332ca01`), and **all 14/14 cases executed PASS**. These are NOT signed live JWT tests.
- The read-only `docs/sql/n10_fixed_recovery_READ_ONLY_PREFLIGHT.sql` can check Vault readiness, RLS and RPC permission exposure with SELECT statements only. No recovery secrets or financial data are selected.
- Read-only Staging inspection: `supabase_vault` exists, but encrypted-backup index, rate bucket, all four RPC functions, and original-phrase verifier do not exist. Read-only Edge inventory: `mmh-n10-fixed-recovery` is not deployed in Staging or production.
- The separate SQL migration execution safety gate remains in force; it was NOT bypassed or retried through another write tool. No live account/password/MFA/recovery data was altered.
- Blockers remain: approved Staging migration path, synthetic account+verifier setup, signed-JWT/multi-user/incorrect-password tests, permissions/deletion/rollback verification and separate production release authorization.

## Signed bearer + live-session revocation gate (2026-10-31)
- A valid JWT is insufficient for sensitive permanent recovery-key escrow/reveal after sign-out: an unexpired token can remain cryptographically valid even when its Auth session has been deleted. Supabase Auth docs permit matching the signed JWT's `session_id` claim with `auth.sessions.id`.
- Added `session-guard.mjs` to *extract and sanity-check* the previously Auth-verified JWT `session_id` with strict UUID, user ID, issuer and expiry checks. It does NOT validate signatures and must never be used without `admin.auth.getUser(exactBearerToken)`.
- Added staging SQL candidate RPC `public.mmh_n10_recovery_session_active(uuid,uuid)` (SECURITY DEFINER, empty search_path, service-role-only execution). Returns true only while an auth.sessions row exists for exactly the authenticated user+session and has not passed not_after. No authentication tables are modified.
- The Edge candidate rejects missing/invalid/revoked sessions; checks again **after** fresh password proof, immediately before any existing-key backup or plaintext reveal. An unavailable auth-session RPC fails closed with HTTP 503.
- The new session guard and its 12 synthetic negative/positive tests were actually executed using Node 22.16.0: **12/12 PASS**, and the exact local test/helper Git blob SHA values matched GitHub (`7e81ffb4ead1dfc2d1f473a4792936683fc2ab13` and `07675147314d2ffbdfcd5cd143685ac86b7f501f`).
- Updated the read-only Vault permissions preflight to inspect the new session RPC. Its Staging execution returned Vault extension true, but private schema, all five planned RPCs, verifier, and backup tables absent. No migration was executed.
- Explicit stop condition: `RECOVERY_RELEASE_ENABLED=false`; the draft PR is NOT for merge until approved Staging schema migration, audited privileges, real signed-JWT + logout + AAL2 QA, error-path tests and rollback rehearsal pass.

## October 31 follow-up: SQL parsing and real schema compatibility
- Fixed a **real syntax bug** in the staging-only SQL candidate: `mmh_n10_recovery_session_active` previously had `AS $` / `$;` instead of the required PL/pgSQL-compatible SQL dollar quote delimiter `AS $$` / `$$;`. No database migration was executed.
- Verified Staging `vault.create_secret` declares `new_secret text, new_name text DEFAULT NULL::text, new_description text DEFAULT ''::text, new_key_id uuid DEFAULT NULL::uuid`. **Three-argument calls were already legal because the fourth argument is optional**; the candidate now supplies explicit `NULL::uuid` for clarity. Do not treat the original three-argument call as an incompatibility.
- Read production's deployed `mmh-n10a769-username` Edge code (without accessing secrets or user rows): original phrase verification HMAC uses `N10A740_RATE_HMAC_KEY` with context `mmh-a769-prod:` and message `phrase:{uid}:{phrase}`, matching the new recovery candidate.
- Read-only production table inspection: `public.mmh_n10a769_recovery_phrases` exists with `user_id`, `verifier`, `version`, `created_at`; RLS is enabled, `anon` and `authenticated` cannot SELECT, and the service role can. Staging does **not** contain that legacy verifier table; never claim its presence without staging synthetic fixture approval.
- Extended `docs/sql/n10_fixed_recovery_READ_ONLY_PREFLIGHT.sql` to check full Vault signature, Auth sessions expiry column, old verifier RLS/SELECT grants, and recovery RPC status. The revised combined query was blocked by tool safety checks and **was not executed**. Earlier individual read-only catalog checks succeeded; never infer that the revised combined query passed.
- Still blocked pending explicitly authorized synthetic Staging verifier and escrow schema, server RPC execution tests, MFA/session/password negative testing, and rollback verification. This remains a draft PR, not production-ready.

### Revalidated final SQL source on GitHub
- Verified the previous attempted dollar-quote repair had silently produced the same text because JavaScript replacement strings interpret `$$` as a special sequence. Replaced the literal function body without replacement-string interpolation, then fetched GitHub again.
- Confirmed GitHub SQL blob `cf12b1f75c7e3198c8fd77297c71f1a41f105425` now actually contains `AS $$` and `$$;` for the live-session RPC. Static source contract checks **13/13 passed** (quote pairs, safe RPC permissions, RLS, immutable key, session double-check, password proof, release gate OFF). **This is static verification only**, not SQL migration execution or runtime testing.

## Actual GitHub CI verification (2026-10-31)
- CI workflow `.github/workflows/n10-recovery-security-offline.yml` runs only on this named review branch / PR and has `contents: read` permissions; it contains no deployment, Supabase access, SQL write, secrets, or user credentials.
- GitHub Actions run [41210847556](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41210847556) **SUCCESS**: all three checks executed: synthetic MFA 14/14, synthetic session claims 12/12, static SQL/Edge contracts 21/21 = **47/47** checks.
- GitHub Actions run [41210936166](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41210936166) **SUCCESS** including Deno 2 TypeScript compile check on the undeployed Vault Edge candidate.
- Strengthened the recovery `reveal` action to check the same live Auth session **three times**, including after the asynchronous Vault read and immediately before returning plaintext words.
- The CI workflow also now type-checks the separate **undeployed** username-signup escrow candidate; check the latest workflow run before claiming its result.
- **Not a release**: no Staging database migration was applied; no live signed-token/password/MFA/2-user tests or Vault RPC permission/revocation tests have occurred. The draft PR must remain blocked until the authorized isolated Staging database test path is available.

## CI milestone: 47 / 47 checks and both Deno type-checks now PASS
- GitHub Actions [run 41211226327](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41211226327) completed **SUCCESS** (2026-10-31). This checks all 47 synthetic + static cases AND Deno TypeScript compilation for both `index.ts` (recovery) and `username-signup-integration-NOT_DEPLOYED.ts` (new-user escrow).
- The new-user signup candidate originally failed Deno strict checks. All implicit-any, nullable user/email/origin and optional token-hash typing issues were fixed in this **unreleased** branch; live production signup has not been replaced.
- The Vault reveal candidate now checks live session status a third time **after the asynchronous secret read**, immediately before responding with plaintext. The candidate release flag remains false.
- The remaining blocker is NOT an uncompiled program: it is the previous safety gate that blocked creation of Staging-only encrypted backup SQL objects. Never treat CI success as approval to bypass that gate, or as evidence of real signed-token or Vault database acceptance.

## October 31 — Draft-only signup failure containment and late MFA check

- Corrected a **candidate TypeScript source regression** where a trailing `//` comment swallowed the `return reply(...,503)` branch of the signup catch handler. The handler now returns a generic 503 without logging raw SDK exception content. This code has not been deployed.
- On failure after an Auth account is created, the unreleased signup candidate attempts `admin.auth.admin.deleteUser(uid)`. If Auth deletion fails, it attempts a long-term ban and deletion of that freshly-created account's username link, and emits a fixed error category plus the generated UID for authorized operator remediation. It does **not** claim that a ban alone revokes previously issued JWTs; no failed-compensation path is accepted until isolated live QA and manual orphan remediation are verified.
- Reservation release is protected with its own error handling so a cleanup exception does not mask a successfully completed new-account signup.
- After decrypting an escrowed phrase, the unreleased recovery Edge candidate again verifies the exact signed-bearer identity **and the current server-managed MFA factor state** before the final live-session check and plaintext response. Missing/mismatched MFA/session details fail closed.
- Added static source contracts for both behaviors. A 16/16 focused **source-invariant inspection** of the draft GitHub files was completed; **this is not** evidence that GitHub CI, Deno compilation or live user/MFA/password tests passed.
- Supabase documentation confirms admin `updateUserById(..., {ban_duration:'876000h'})` supports bans, but also warns that a ban is not a substitute for deleting an Auth user or checking live `session_id` for sensitive operations. Never mark orphan cleanup successful based solely on a ban.
- The blocked Staging SQL migration remains unexecuted. The deployment feature flags remain OFF. Before any production release, test failed-signup rollback, ban/unlink fallback, orphan Vault and verifier cleanup, password/MFA concurrent enrollment, and old signed-session rejection with synthetic Staging accounts.

**Operational status remains:** Draft PR, no merge, no N10 Vault release, no V11 code changes, no Staging or production database writes.

## 2026-10-31 — Latest offline execution and Staging integration constraints

- Latest candidate source update adds explicit `scope: 'local'` sign-out **only when an isolated email/password grant failed identity validation**. A successfully validated session returned to the rightful user is not revoked. This targets the new-signup partial-grant failure path and needs real Staging Auth tests.
- Executed *all four checked-in offline JavaScript assertion suites* in a restricted JavaScript harness reading the latest GitHub branch: **MFA 14/14, session claims 12/12, backend+SQL static contract 27/27, client secret-guard static contract 10/10 = 63/63 PASS**. The harness provided minimal Buffer/Base64/TextDecoder and assertion adapters for the repo tests; it did **not** run Node/Deno CI, test signed real JWTs, touch Supabase, or exercise real account/password events. Do not conflate these with live tests or latest GitHub Actions status.
- **Additional integration prerequisite:** `username-signup-integration-NOT_DEPLOYED.ts` is intentionally pinned to production project `vrypucmyrztxgiqhjspd`, origin `https://mmhvault.com`, and CAPTCHA hostname `mmhvault.com`. It cannot be used as-is to validate *Staging* signup, and attempting to use production credentials or disable CAPTCHA for QA is forbidden. Develop a separately gated Staging-only deployment/test adapter with isolated QA credentials, verified QA domain/Turnstile configuration and synthetic accounts after receiving proper migration/test approvals. Production remains untouched.
- No actual recovery Vault private schema, escrow table, rate bucket, RPC or synthetic original verifier is installed in Staging. The previously blocked Staging SQL execution gate was not retried or bypassed. All new-feature runtime release flags remain false.
- **Stop before release:** approved Staging migration path, tested isolated signup harness, real JWT + AAL1/AAL2, actual password reauthentication, live logout/revocation, failed-Auth-delete orphan handling, Vault secret cleanup, read-only RLS/ACL inspection, and rollback rehearsal are still required.

## October 31 — Isolated synthetic verifier fixture prepared, **not installed**

- A read-only metadata comparison found the production legacy verifier table has `user_id uuid` referencing `auth.users` with ON DELETE CASCADE, `verifier text` (64 lowercase hex digits), `version smallint` (fixed at 1), and `created_at timestamptz`.
- Staging currently has the username-links table and the Vault extension but **not** the original-phrase verifier table or the new private recovery schema.
- Prepared `docs/sql/n10_fixed_recovery_verifier_SYNTHETIC_STAGING_ONLY.sql` as a deliberately separate, first-install-only, **empty** synthetic verifier fixture mirroring the production verifier's structure, strict RLS and backend-only access. It creates no users, secrets, phrases, verifiers or financial data.
- That file is **not permission to apply a migration**. The previous SQL safety gate remains unresolved and must not be bypassed by the SQL editor, connector, branch merge or another channel. Installing this fixture or the Vault candidate requires its own explicitly approved, auditable path.
- Synthetic verification HMACs must be created with a **Staging-only** secret from synthetic phrases after test-user approval, never copied from production. Do not reuse production `N10A740_RATE_HMAC_KEY`.
- This fixture is for the **existing-account** recovery backup/reveal integration test, not evidence that full username-only signup is staged. The signup integration candidate remains production-host pinned and needs an isolated Staging adaptation before live QA.
- Rollback must clear only the authorized synthetic users and corresponding verifier records, then remove the isolated fixture table after confirmation no other objects depend on it. Never run unreviewed CASCADE DROP or modify production.

**No staging or production SQL change was performed.**
