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
Owner creates the two new **Staging-only** Auth user fixtures through the dashboard, leaving all credentials private; then a scoped **read-only** UID/email cross-check can be carried out. No joint MFA activation or production release is authorized by completing that action.
