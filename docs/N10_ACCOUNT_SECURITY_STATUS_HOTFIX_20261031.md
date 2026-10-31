# MMHVAULT N10 — Account Security status hotfix (2026-10-31)

## User-visible issue
In the production Settings > Password & devices > Account Security panel, a successful password sign-in could still show "Sign in to view account security" and block Google identity linking / username status / TOTP management. After a guarded frontend fix, Google identity linking recovered, while the username status continued returning "Temporarily unavailable".

## Changes applied
- Production GitHub main: `js/mmhvault-n10-a7-83-security-center.js` blob `2009319819f7e20b82dac3e0f4572e2bdf982799` (`af090efa6d589f8e9a501ec95aa7c532c022e0bb`). Independent identity, factor and status requests now use `Promise.allSettled`; a failing status API does not falsely sign the user out or disable verified Google controls. Account-recovery actions still fail closed.
- Production Edge `mmh-n10a783-phrase-verify` v4 ACTIVE, `verify_jwt=false` (as in original v3). It performs mandatory manual `admin.auth.getUser(jwt)` verification, then reads server-owned MFA factors via `admin.auth.admin.mfa.listFactors({userId})`, and passes the verified factor inventory to the JWT AAL checker before status/recovery handling. No caller-provided factor metadata is trusted.
- Staging Edge `mmh-n10-qa-phrase-integration-20261031` v3 ACTIVE, with QA-only return before sensitive operations. No production finance data or RLS policies were changed.
- Immutable revert source copies committed at `fix/n10-account-security-status-503-20261031/security/n10-edge-account-fix/rollback/` (production Edge v3 index and helper). Frontend code pre-change backed up at `backup/n10-security-center-before-503-fix-20261031`.

## Verification
- Synthetic assurance helper checks: 7/7 PASS (unenrolled AAL1; enrolled AAL1 deny; enrolled AAL2 allow; missing factors, expired token, wrong issuer and wrong UID fail closed). These do NOT replace real Auth-issued signed-token tests.
- Production Edge v4 read-back: ACTIVE, manual JWT verification preserved, admin factor inventory check installed, MFA gate before status action.
- Production DB read-only check after Edge deployment: 59 N10 business RLS policies, 1 Storage MFA policy, wallet MFA marker unchanged.
- The user supplied a screenshot proving the frontend fix independently restored the Google linking button while the username status endpoint remained unavailable.

## Outstanding
1. Owner's fresh-session username account panel acceptance after Edge v4; screenshot/text only, no passwords, bearer tokens, recovery words or TOTP QR.
2. Staging signed-token acceptance for updated Admin MFA-factor path and read-only prod logs; if status is still unavailable, use scoped function logs and revert Edge v4 to recorded v3 if needed.
3. TOTP new-enrollment switch stays `N10A790_TOTP_ENROLLMENT_RELEASED=false` until recovery plan and user acceptance; do not flip it based solely on a UI screenshot. Google identity linking must be tested with the same-UID post-OAuth assertion.

No automatic merge of Draft PR #1 and no reapplication of the N10 SQL migration.
