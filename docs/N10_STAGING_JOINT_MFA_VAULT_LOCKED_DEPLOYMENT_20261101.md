# N10 — Staging joint MFA + Vault QA: deployed OFF, not tested

Status: **LOCKED / PREPARATION ONLY**. Approved by owner for Staging *preparation* on 2026-11-01 (Asia/Bangkok). This is **not** authorization to enable the function, perform signed-token joint QA, access restricted Vault secret inventories, merge PR #2, or release production.

## Deployed independent Edge
- Project: **MMHVAULT-Auth-Staging** `ldivswlhtgmznzwhzsoi` ONLY.
- Newly created function: `mmh-n10-qa-joint-mfa-vault-20261101` (separate from retired `mmh-n10-fixed-vault-qa-locked`).
- New function ID: `da53e3b3-e138-45f5-990c-5eb63bc7944d`; version **1**, status **ACTIVE** (deployed, **not open for testing**); `verify_jwt=true`.
- Source: `security/n10-fixed-recovery-vault-candidate/qa-joint-mfa-vault-STAGING-NOT_DEPLOYED.ts` at PR head `e2f6a475e338e0d8781399f75c40d55d5b991ac0` before subsequent documentation-only commits. Deployed entrypoint Git blob `24e6757c5cc70dffb567fee71aefb95996ac3664`. Local `mfa-assurance.mjs` and `session-guard.mjs` uploaded as relative dependencies.
- Deployment digest `6d40aa0b2a51e9c63c88f19904506a7fbb3169221200d6ecf1cf14ad01b3ef05`.
- Post-deployment confirmation read the actual function metadata and remote source.

### Triple closed gates (each separately prevents service use)
1. `RECOVERY_RELEASE_ENABLED=false` — code returns `recovery_service_not_released` 503 before any Auth/Vault operation after request method/origin validation.
2. `QA_IDENTITIES=new Map<string,string>([])` — there is **no** approved Auth UID/email pair; `ALLOWLIST_OK=false`.
3. `QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z'` — deadline is expired; request receives `qa_window_closed` if the release flag were ever independently altered.
- Exact project URL pin `https://ldivswlhtgmznzwhzsoi.supabase.co`; QA origin `https://myintmoehein0115024.github.io`; dedicated `N10_FIXED_RECOVERY_QA_HMAC_KEY` binding (no secret value stored or supplied). Existing deleted QA A/B UIDs and emails are deliberately **not present**.
- No SQL migrations, Secrets, Vault rows, RLS, shared helpers, production services, app.html, login.html, DNS or user finance records modified in this deployment.

## New isolated synthetic accounts — CREATED AND VERIFIED (Staging only)
- Read-only Auth UUID/email mapping checked on project `ldivswlhtgmznzwhzsoi`, no credentials retrieved:
  - A: `n10-joint-mfa-a-20261101@no-mail.mmhvault.invalid` → `be5ec3b7-a35f-4a53-b2b7-0ff77a01fc4f`
  - B: `n10-joint-mfa-b-20261101@no-mail.mmhvault.invalid` → `ccefb6d3-9ad1-4e3f-9d50-d9d54e826c11`
- Both have exactly one matching `auth.users` row, confirmed email, non-anonymous status and no unexpected `mmhvault_auth_kind` / `mmhvault_username` app metadata.
- Read-only `auth.mfa_factors` count: A=0, B=0 verified factors; **A TOTP enrollment has not begun**. User retained both separate passwords; no password, token, TOTP or recovery phrase shared.
- These IDs are **synthetic fixture identifiers only**, not a live allowlist. Newly deployed Staging QA Edge still has `QA_IDENTITIES=new Map([])`, `RECOVERY_RELEASE_ENABLED=false` and expired QA window. No Edge source change or MFA enrollment/verification authorization was inferred from account creation.
- Next: separately approved setup of isolated MFA enrollment and signed AAL1/AAL2 joint QA, with current code SHA and precise window/rollback. Never reuse retired QA pages or their old test identities; the older `n10-qa.html` gates enrollment to username-only accounts and must **not** be assumed compatible with these new synthetic email-only fixtures.

## Review and authorization gates still outstanding
- Latest pre-deploy source CI `2214c71f9d12a37385b887351f648d32fc2a0639`: [Actions run 41227613147](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41227613147), **SUCCESS**, 14/14 synthetic MFA, 41/41 backend/static contracts, 10/10 UI static checks, five candidate TS files Deno check. Tests are **not signed E2E**.
- Legacy Staging security advisor findings remain: authenticated role could execute legacy `public.mmh_n10_qa_privileged_read` SECURITY DEFINER (WARN); leaked-password protection disabled (WARN). No changes authorized in those areas. [Definer advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) · [Password guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- `VAULT_DELETE_E2E=UNVERIFIED` — sensitive Vault inventory was blocked previously. Do not circumvent the block. Nothing in the current preparation proves cleanup.
- `FIXED_RECOVERY_MFA_VAULT_JOINT=UNTESTED` — no actual AAL1/AAL2+Vault joint QA has been executed against the new function.
- `N10_PRODUCTION_RELEASE=BLOCKED`; PR #2 remains Draft and merge-conflicted; V11 remains paused.
- Future cleanup: preserve old retired Edge tombstone and shared MFA helper; delete **only** these newly authorized synthetic Auth users and the new dedicated Edge / dedicated Secret after a separate, approved test window; verify non-sensitive account removal and escalate Vault deletion evidence to a separately permitted audit authority.

## Next action
**Superseded (A/B already created and server-verified).** The latest next action is to resolve the blocked reactivation gate through its normal authorized path, *without* bypass, then run a newly scoped staging-only TOTP attempt. Do not enable this test page/Edge under the existing blocked command.

## A TOTP enrollment window 2026-11-01 — INCOMPLETE (server evidence)
- User reported `A TOTP PASS` after using isolated test page. **Do not accept this alone as server-side success.**
- Immediate read-only Staging verification against **only** synthetic A/B Auth and MFA factors showed:
  - A: 1 `auth.mfa_factors` row, factor type `totp`, status **`unverified`**, 0 verified factors; one challenge was created at `2026-10-31 18:28:10 UTC`, **zero verified challenges** (`verified_at` absent).
  - B: 0 MFA factors, 0 verified factors.
- No TOTP values, QR seeds, passwords, tokens or encrypted Vault contents were read or disclosed. This proves a challenge was attempted; it **does not** prove TOTP enrollment/AAL2.
- Immediately restored `QA_RELEASED=false` and `QA_WINDOW_END_UTC=1970-01-01` on isolated QA JS, adjusted locked-state tests, cache-busted the static HTML entrypoint. Commits: `327e505` (OFF), `5b2f6da` (test), `14e84f7` (fresh link). GitHub Pages build/deploy action `41229754196` should be confirmed SUCCESS before declaring static site fully redeployed. Source lock was immediate; browsers may cache an older bundle until refreshed, but approved deadline also rejects post-expiry.
- Retired QA Edge unchanged; newly deployed `mmh-n10-qa-joint-mfa-vault-20261101` remains OFF, empty allowlist, expired deadline. No production changes.
- Classification: `A_TOTP_ENROLLMENT=INCOMPLETE`, `JOINT_FIXED_RECOVERY_MFA_VAULT=UNTESTED`, `VAULT_DELETE_E2E=UNVERIFIED`, release BLOCKED. If a new enrollment attempt is needed, use a new explicit finite Staging-only approval. Confirm status directly from server before telling the owner it passed.

## 2026-11-01 follow-up — Audit-only root-cause refinement and active release HOLD
- Owner approved a second limited A-only binding attempt, but the attempted **GitHub activation commit was blocked by an OpenAI safety check**. Do **not** retry through a different branch, GitHub API, action, role, user intervention, or deploy route to circumvent this denial. No reactivation occurred.
- Read-only exact A/B Staging audit reconfirmed A: one TOTP factor, **0 verified TOTP**, one challenge, **0 verified challenges**; B: no factors. Earlier GitHub Pages LOCKED source `QA_RELEASED=false`, deadline `1970-01-01`; latest LOCKED source deployed via Actions `41230362665` (SUCCESS). Offline security contract Actions `41230362919` (SUCCESS).
- Non-sensitive Auth audit events scoped to A and `2026-10-31 18:27–18:30 UTC` show `challenge_created` **1** (factor_status `unverified`), `factor_in_progress` **1**, `login` **5**, `logout` **5**. These aggregate labels prove no successful factor verification; they do **not** establish why `mfa.verify` failed or assign the cause to a device or clock. Avoid raw messages, IPs, User-Agent, TOTP codes, JWTs, or QR seeds.
- Possible usability factor identified in the current QA client: on `visibilitychange` to hidden, it intentionally clears the QR and ends the ephemeral session. For any *future independently permitted* test, keep the **computer/browser tab visible** and use a **separate phone** to scan TOTP. Switching to an authenticator app on the *same* device can cause a false-incomplete enrollment. This is a hypothesis, **not an established explanation** of the recorded failure.
- Independent `MMHVAULT-Auth-QA` page was updated (while still LOCKED) with the separate-device guidance and strict `verified + AAL2` acceptance. Front-end errors are sanitized and no secrets/tokens are persisted, logged, or displayed.
- No production, Vault inventory, RLS, secrets, or old retired QA Edge modifications. **Staging joint Vault Edge remains OFF**; `A_TOTP_ENROLLMENT=INCOMPLETE`, `JOINT_FIXED_RECOVERY_MFA_VAULT=UNTESTED`, `VAULT_DELETE_E2E=UNVERIFIED`, `PRODUCTION_N10_RELEASE=BLOCKED`.

## 2026-11-01 — A TOTP name-conflict evidence and locked-only remediation
- Read-only aggregated Staging `auth_logs` for the original binding interval `2026-10-31T18:27:00Z–18:30:00Z` returned these sanitized backend errors: `mfa_factor_name_conflict` **4** requests (422); `mfa_verification_failed` **1** request (422); `invalid_credentials` **1** request (400). The same aggregate included HTTP 200/204 success statuses for other Auth requests. The records are evidence of repeated **duplicate-friendly-name enrollment failures** plus a failed OTP verification. Avoid attributing the verification error to a specific device, OTP entry, or session without further evidence.
- In separate QA repo `myintmoehein0115024/MMHVAULT-Auth-QA`, **LOCKED** `n10-joint-mfa-bind-20261101.js` changed at `515f22395c39167ebb8407dea2d0575cac6e243b`: after removing the previous unverified Auth factor, a fresh `auth.mfa.listFactors()` must show zero TOTP factors; otherwise fail closed. New MFA enrollment uses `friendlyName='MMHVAULT N10 Staging A '+crypto.randomUUID().slice(0,8)` instead of the fixed `MMHVAULT N10 Staging A`, avoiding repeated collisions. Code continues to reject all live logins because `QA_RELEASED=false`, expired deadline.
- Dedicated offline regression added at QA SHA `4bc9d85ff672f2adf30988db05989118f9840ff3` to verify cleanup → recheck → unique name → enroll order and LOCKED invariants. No QA activation was attempted or restored after the earlier safety-denied attempt; do not evade that denial.
- `A_TOTP=UNVERIFIED`; new joint Vault Edge remains OFF with empty whitelist/expired QA window; no Vault data, real production accounts, DNS, Auth settings or finance SQL modified.
