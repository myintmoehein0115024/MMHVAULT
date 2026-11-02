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

## 2026-11-02 — Two-owner signed MFA QA preparation (NOT RUN)

Offline security tests have been expanded from 11 to **23**. New tests validate owner/session/issuer/expiry JWT claim parsing **after real Auth verification**, independent AAL1/AAL2 assurance, MFA enrollment/removal and stale-token denial. JWT-like samples are **synthetic strings without valid signatures**; they do **not** satisfy signed real-account QA. The three hard-OFF QA gates, production host exclusion and full source diff check remain intact.

### Preconditions for a separate, specifically approved short Staging QA window

1. **Two NEW isolated synthetic Staging accounts A/B, created solely for this QA** and separately verified in Supabase Auth. The pre-existing two `username_only_staging` fixtures are NOT permitted as a shortcut; the current locked service deliberately requires two specific UID+email bindings with no username-only app metadata.
2. Both A/B must be explicitly owner-approved for the test, with secure password creation and at least one verified TOTP AAL2 factor. No user credentials, TOTP seed/QR, JWT, recovery phrase or secret key may be sent into chat or printed into logs/CI.
3. Prior to any unlocking, revalidate exactly the Staging project `ldivswlhtgmznzwhzsoi`, original QA function slug and four deployed v2 source files, empty Vault fixtures, rate limiter, private grants, accepted GitHub Pages QA origin, and the pinned 3-argument session/AAL guard. Production must remain untouched.
4. Only under **new explicit authorization** may the Staging-only window, two UID/email bindings and QA release gate change. End the window promptly regardless of result. Preserve a known-good hard-OFF v2 source snapshot before the temporary QA change.

### Real signed test matrix (future, do not claim passed)

| Step | Expected behavior |
| --- | --- |
| No bearer / wrong origin / non-allowlisted user | Denied before reading secrets |
| A valid AAL1 account without verified MFA | Limited to its own status; never B's secrets |
| A AAL1 bearer after enrolling verified TOTP | `mfa_required` until a fresh AAL2 challenge |
| A verified AAL2 signed owner, correct password | Can initialize QA-only phrase and save/read exactly that immutable phrase |
| Wrong current password or exceeded attempt quota | Denied; no decrypted words, no reset or rotation |
| B token with A phrase / B trying A Vault ownership | Denied by server owner binding, not user-supplied ID |
| Revoked/expired session, MFA removal, stale JWT, or account switch mid-request | Denied before phrase disclosure |
| Repeat same original phrase backup | No rotation; immutable comparison succeeds without changing words |
| Submit another phrase to overwrite fixed original | Denied; existing original unchanged |
| Cleanup after window | Restore OFF + expired window + empty identities; verify only new QA fixture records are removed with explicit scope authorization; preserve all pre-existing accounts |

**Current blockers:** 0 verified MFA test factors, 0 signed AAL2 test sessions, 0 encrypted QA backups; no active QA allowlist and no active QA window. The signed E2E matrix remains **NOT RUN**. This stage does not authorize creating or deleting actual accounts or toggling switches.

### Final disposition of this review round

- Staging QA v2 remains **deployed but locked** (`verify_jwt=true`; release disabled, expired window, empty allowlist).
- Newly expanded offline suite: **23 synthetic checks**, including source v1 exact-diff and lockout assertions.
- Any future E2E run requires explicit fresh Staging-only permission and suitable authenticated test capabilities. This review must never be construed as a production approval.

## 2026-11-02 — User-approved Staging two-owner E2E: executable capability check

The user has **approved** two new synthetic Staging accounts, controlled signed MFA/Recovery Vault QA, and restoring all hard-OFF controls afterward. That authorization **does not** permit bypassing Auth or generating fake successful MFA sessions.

Read-only audit after approval verified:
- Existing Staging QA v2 Edge still has `RECOVERY_RELEASE_ENABLED=false`, expired test window, empty identity allowlist, and `verify_jwt=true`.
- Two **older username-only fixtures** remain in Staging; 0 verified MFA factors, 0 signed AAL2 fixture sessions, 0 encrypted backups. The current joint-MFA QA service deliberately **does not authorize** those old username-only fixtures.
- Both old and new server-only session guards exist and retain restricted EXECUTE access. Supabase's security advisor showed the two private Vault tables as RLS-enabled with no policies; this is their **deliberate deny-by-default design**, not authorization to expose them. A separate Staging advisory notes leaked-password checking is disabled; it was not changed.
- The available connected Supabase actions expose schema SQL, Edge deployment, read-only logs and project information but **do not expose supported Auth administration + interactive MFA challenge actions or a credential-safe HTTP invocation facility**. Fabricating GoTrue records directly by SQL would bypass Auth and fail to validate true signed login. Such writes were **not attempted**.
- Accordingly **NO NEW ACCOUNT WAS CREATED, NO QA WINDOW WAS OPENED, AND NO SIGNED AAL2 OR VAULT REVEAL TEST HAS BEEN RUN** in this authorized phase. No production changes.

New review-only files in this Draft PR:
- `qa-admission.mjs`: fail-closed, Staging-only admission contract requiring two distinct newly created trusted Auth identities, verified signed owner sessions, TOTP AAL2, correct password proof, verified Vault owner isolation, and a maximum 10-minute window. Merely passing admission still **cannot** open a live endpoint or reveal any original phrase.
- `test-qa-admission.mjs`: 12 synthetic admission/cleanup cases verifying wrong project, reuse of existing accounts, unsigned/mismatched sessions, invalid MFA, excessive window, denial of release without independent sign-off, and a close-first exact-ID revoke-and-delete sequence.
- `closeStagingQAAndCleanup`: review-only orchestrator that must first confirm the QA endpoint is closed. It then revokes and deletes **only** two newly Auth-confirmed account IDs associated with the current run; failed revocation, ambiguous creation, failed deletion or unmatched run tags fail closed and require manual reconciliation. This has no deployed import and was never invoked against users.

**Execution blocker and next needed capability:** An approved Auth-admin + MFA-capable cloud-computer session, or an explicitly authorized secure test harness with credential-safe invocation, is needed before the two new accounts can be created and the signed TOTP flow can be genuinely exercised. Secrets must not be pasted into chat, uploaded to GitHub or logged. Until that capability exists, keep the Staging QA service closed and do not claim an E2E pass. No additional authorization to change production is implied.
