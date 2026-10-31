# MMHVAULT N10 — Safe evidence / exact-service joint MFA release gate
Date: 2026-11-01 · Draft-only review · **NOT an execution authorization**

## Authoritative scope
- Draft PR #2, branch `feature/n10-fixed-recovery-key-modal-20261031`, no merge, no production release, V11 paused.
- Staging: `ldivswlhtgmznzwhzsoi`; production: `vrypucmyrztxgiqhjspd`. Never share credentials, keys, users, migrations or endpoints across these projects.
- Production candidate `security/n10-fixed-recovery-vault-candidate/index.ts` is hard-pinned to `https://mmhvault.com` and production base, with `RECOVERY_RELEASE_ENABLED=false`.
- The retired Staging recovery QA Edge `mmh-n10-fixed-vault-qa-locked` v8 is an HTTP 410 tombstone with `verify_jwt=true`. **Never repurpose or re-enable it.**
- The old shared MFA QA helper is used by other QA flows. Do not disable or mutate it.
- Three purpose-built synthetic QA users (A/B/TOTP) were deleted; user absence was independently read-only verified. The old QA HMAC Secret was operator-deleted, without independent secret listing. Do not reuse these identities or secrets.

## Evidence register (must preserve distinctions)
| Gate | Current evidence | Release status |
| --- | --- | --- |
| Password re-auth, synthetic escrow put/get, wrong-password denial, logout denial, 45-second UI auto-hide | Owner-observed signed Staging QA against previous limited recovery QA adapter | PASS for tested scenarios only |
| TOTP verified, enrolled AAL1 denied (403), AAL2 allowed (200) | Independent MFA check service only | PASS for independent checker; **NOT** fixed-recovery + Vault joint E2E |
| Deleted synthetic users absent | Read-only `auth.users` evidence | PASS for Auth account absence only |
| FK cascade + enabled Vault cleanup trigger + reviewed deletion function | Staging `pg_catalog` and migration-source inspection | Structural review PASS; **NOT** actual Vault secret cleanup |
| Vault secret absent after user deletion / no orphaned secret | Direct sensitive Vault inventory was blocked by a safety control | **UNVERIFIED — HARD BLOCKER** |
| Exact fixed-recovery Edge with verified TOTP and encrypted Vault put/get | No authorized combined Staging execution | **UNTESTED — HARD BLOCKER** |
| CI and Deno at baseline commit `5fc213881da334ab700b92a83018415ca4aa413e` | [Actions run 41226412163](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41226412163): completed SUCCESS; Deno check includes all four candidate TS files | PASS for offline/type checks at that SHA only |

## Gate A — real Vault deletion-cleanup evidence, without bypassing a denial
1. Freeze the affected QA data scope, branch SHA, known synthetic user IDs, source versions, and clean-before/after expectations. Never use real users or production objects.
2. Obtain **explicitly authorized and independently permitted** audit evidence for the precise synthetic index → Vault secret lifecycle, with timestamps and object identity correlation. The previously blocked direct sensitive Vault inspection must **not** be retried through different SQL, tools, roles, endpoints or connections. Do not turn an alternate boolean/count/query into a workaround.
3. Accept the gate **only** if an approved audit authority can attest to evidence of actual encrypted-secret creation, same-secret deletion upon user removal, absence of an orphan, and independent account-isolation checks, without disclosing plaintext words/secret values. A signed operator/auditor attestation naming the authorized evidence source and scope can be reviewed, but is not automatically sufficient without independent audit acceptance.
4. If no permitted evidence mechanism exists, or the evidence is ambiguous, contradictory or incomplete: **leave UNVERIFIED, stop release, escalate for safe independent review**. FK/trigger definitions, no-account results, and software assertions alone are insufficient.
5. No blanket deletion of Vault rows, no production SQL or destructive remediations under this plan.

## Gate B — exact fixed-recovery service + TOTP + Vault joint QA (new approval required)
The following is a **test specification, not approval to create or deploy anything**.
1. Create a separately reviewed, uniquely named **new** Staging-only QA adapter derived from the **exact candidate behavior/version**, preserving password proof, signed-JWT server validation, current factor lookup, account-owned UID, multiple active-session checks, immutable verifier and Vault RPC paths. Explicitly pin only the Staging project and approved QA origin. Keep its release flag OFF at initial deployment and `verify_jwt=true`.
2. Require new operator-approved Staging-only synthetic users A/B, with TOTP verified for A, isolated HMAC/QA Secret, exact UID allowlist, short hard expiry, narrow privileges and a written rollback owner. Do not reuse deleted identities, old Secret, old tombstone or production-host-pinned code as-is.
3. Record actual **HTTP status and canonical error code** (no tokens or phrases) for:
   - A with enrolled verified TOTP, **AAL1**: `backup_existing` and `reveal` must both deny, no secret disclosure or creation.
   - Same A after signed TOTP escalation to **AAL2**: backed-up immutable synthetic phrase may be read with correct fresh password; repeat same backup idempotent; different phrase rejected.
   - B owner separation, B cannot read A; forged/expired/missing bearer; wrong password; revoked/logged-out old session; factor removal with stale AAL2; rate-limit sixth attempt; infrastructure failure must fail closed.
   - UI: words and QR disappear at 45 seconds and on modal close, tab hide, logout or account switch; no stale async response leaks.
   - Signup compensation/rollback is a separate required gate if automatic new-username escrow is included in N10 release scope.
4. Capture per-test outcome, exact code SHA, deployed version, staging project, test timestamps, evidence location and operator signoff. Never store JWTs, passwords, OTP, QR seed, HMAC key, raw ten words, Vault plaintext or personal financial data.
5. Stop the QA window, close test switch, decommission **only** the new single-purpose test deployment, delete newly approved synthetic accounts, revoke/delete test-only Secret, then perform permitted post-test cleanup verification. Previously shared services remain untouched.
6. If Gate A cannot be independently proved, Gate B may be prepared and reviewed but **cannot authorize production rollout**.

## Gate C — CI, production safety, separate authorization
1. Check GitHub Actions and `deno check` again on the **exact final PR head SHA**; previous green runs are not proof of a later commit.
2. Review the real code and rollout for Username, Email, Google, recovery UI, password reset, MFA enrollment, browser/PWA variants, client-session isolation, finance RLS/account/transaction invariants, and exact release flag/project pin.
3. Record known Staging security advisor findings: legacy SECURITY DEFINER QA warning; leaked-password protection not enabled. Decide separately with owner; do not change older shared QA or production settings as a side effect.
4. Confirm rollback and non-destructive backups before switching on any production features. Do not modify production finance records, DNS, existing auth or unrelated Landing branch under this gate.
5. **Separate explicit user approval** is mandatory for a narrowly scoped production release. No auto-merge, no automatic activation; until then keep Draft PR and flags OFF.

## Decision record
- `VAULT_DELETE_E2E=UNVERIFIED`
- `FIXED_RECOVERY_MFA_VAULT_JOINT=UNTESTED`
- `PRODUCTION_N10_RELEASE=BLOCKED`
- `V11=PAUSED`
- This document does not certify, deploy or authorize anything.
