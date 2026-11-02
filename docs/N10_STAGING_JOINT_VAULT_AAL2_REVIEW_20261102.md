# MMHVAULT N10 — Staging Joint MFA + Vault QA AAL2 integration review

**Date:** 2026-11-02  
**Branch:** `feature/n10-staging-joint-vault-aal2-20261102`  
**Target:** Existing isolated Staging QA Edge `mmh-n10-qa-joint-mfa-vault-20261101` only  
**Project:** `ldivswlhtgmznzwhzsoi` (NEVER Production `vrypucmyrztxgiqhjspd`)  
**Production release:** NOT AUTHORIZED.

## Source and impact assessment

- The deployed Staging QA Edge version **1**, `verify_jwt=true`, was inspected before developing the candidate. Its original `index.ts` is preserved exactly in `security/n10-staging-joint-vault-aal2/rollback/v1-index.ts`. Its existing `mfa-assurance.mjs` and `session-guard.mjs` are carried forward unchanged.
- This branch contains an AAL-aware candidate `index.ts` and a pure `session-aal.mjs` helper. The candidate updates **all SIX** current `liveSession` invocations from the legacy two-argument SQL RPC to the newly installed, backend-only `mmh_n10_recovery_session_active(uuid,uuid,text)`.
- `p_expected_aal` is derived exclusively from **server-verified MFA factors** returned by the privileged Auth API, after independent verification of the signed access token. Invalid/missing factor state fails closed. An AAL1 session with enrolled MFA or an AAL2 session with an invalid factor is rejected by the new database guard.
- **All FIVE** additional post-password / pre-write / pre-disclosure identity checks also require the same server-derived MFA level. The SQL guard is called again just before exposing original words.
- The existing MFA and Auth session guard helpers remain unchanged. A strict offline test reverses only the allowed source modifications and asserts the resulting file is byte-for-byte identical to the previous QA v1 entrypoint.

## Three immutable lockouts on the QA endpoint

**All OFF, retained from deployed Staging version 1:**

1. `RECOVERY_RELEASE_ENABLED=false`.
2. `QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z'` (expired).
3. `QA_IDENTITIES=new Map<string,string>([])` (no allowlisted QA accounts).

Its project and origin are pinned to `ldivswlhtgmznzwhzsoi.supabase.co` and `myintmoehein0115024.github.io`. It must not accept the production origin. `verify_jwt=true` must remain unchanged. The QA endpoint has no authorized account access or live Vault disclosure in this stage.

## QA and release status

- The DB-only 3-arg overload was installed in Staging under separate user approval (migration `20261102122942`), with signed two-owner AAL2 E2E **still pending**.
- Strict offline safety tests cover server-derived AAL, MFA enrollment/removal, malformed factors, preserved lockouts, exactly six new DB calls and five MFA rechecks.
- The **new Staging QA source does not generate or replace existing original ten words**. Existing synthesized phrase actions remain inaccessible behind the unchanged hard-OFF locks.
- Any future enabling requires two new, specifically approved, signed synthetic QA accounts, verified MFA/AAL2, new QA window authorization, password proof, isolated Vault ownership checks, logout/revocation and post-run cleanup. Do not reuse old accounts or production credentials.
- Never enable the Edge and reveal words merely because SQL/CI unit tests pass.

## Deployment and rollback conditions

Only a separately authorized **Staging-only hard-OFF** update to this existing QA Edge can be considered after exact source/lockout review and passing CI. Do not create new production Edge functions, change JWT settings, secrets, CORS, RLS, Vault records or user accounts.

For rollback, redeploy the immutable `rollback/v1-index.ts` plus the two original unchanged helper files to the **same Staging QA Edge slug with `verify_jwt=true`**. Do not delete or replace the new three-argument Staging SQL function as part of Edge rollback. Both QA versions remain locked.

## Parallel project protection

No `app.html`, `login.html`, APP V11 finance logic, Landing/SEO assets, production backend, user data, database schema or public account security page are modified by these GitHub-only review files. Before merge, refresh the latest `main` and N10 PR #2, #11, #37, #43, #50, #52 and #56. Do not merge without explicit owner approval.

## 2026-11-02 — actual closed Staging QA v2 deployment

Following the user's "好的，继续" in response to the stated need for the next Staging test-service integration, the **existing isolated QA Edge** was updated in Staging only:

- Slug: `mmh-n10-qa-joint-mfa-vault-20261101`; project `ldivswlhtgmznzwhzsoi`.
- Before: active **v1** (`verify_jwt=true`); exact v1 entrypoint preserved under `rollback/v1-index.ts`.
- After: active **v2**, `verify_jwt=true`; deployed SHA-256 `2a8cb4c4a7522ddccac7947fd9bd6d5c1605aa206ba472a8d4df87ce5c246fc3`.
- Deployed `index.ts`, `session-aal.mjs`, `mfa-assurance.mjs`, `session-guard.mjs` were individually fetched back from the Staging function and compared byte-for-byte against this feature branch: **all four match**.
- Three hard-OFF gates are still **OFF / expired / empty**. No QA time window, account whitelist or recovery-word release was enabled.
- Read-only Staging aggregate postcheck: **2** dedicated username-only test accounts remain, **0** encrypted backups and **0** rate buckets. No accounts, RLS, SQL RPC, live auth settings, Edge secrets, financial records, or Vault data changed in this deployment.
- The new QA service is only **code-integrated** with the Staging AAL-aware RPC. Signed two-owner MFA AAL2 success, password proof, logout/revocation, encrypted 10-word ownership and actual `reveal` remain **UNTESTED and BLOCKED BY THE THREE QA GATES**. Do not claim them passed.
- Production Edge, `mmhvault.com` and all user financial data remained unchanged.

**Rollback readiness:** The exact v1 entrypoint and unchanged original two helpers are available in this branch; redeploy to the same Staging-only slug with `verify_jwt=true` if a separately approved rollback is ever needed. No rollback was necessary.
