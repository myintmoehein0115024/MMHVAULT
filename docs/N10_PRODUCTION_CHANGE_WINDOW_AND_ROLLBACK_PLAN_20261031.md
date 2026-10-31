# N10 — Production release and emergency rollback plan (REVIEW ONLY)
Date: 2026-10-31. **NO PRODUCTION DEPLOYMENT AUTHORIZED.** PR #1 remains Draft.

## Current production baseline, read-only observed
- GitHub main commit (PR base): `9ef8461af143c02526df38c2e7b2599e960855da`.
- Production `login.html` blob: `86d01dd694b8a0dc2cea0a1bbea5826dc1ddb69d`.
- Production `app.html` blob: `87ab2e01702c3afaae33aa6080c23eb630a9a1e8`.
- Privileged Edge baseline:
  - `mmh-financial-assistant`: version 8, `verify_jwt=true`, SHA-256 `61061fbd63f5986f0713a2b24f3ceb86640c5e75e12e59879378ca47e7d37fd7`.
  - `mmh-push-test`: version 6, `verify_jwt=true`, SHA-256 `0a745b73c24751a80b87828701f50646734da2b66c9ade4082be97579617668b`.
  - `mmh-n10a783-phrase-verify`: version 2, `verify_jwt=false` (manual Auth bearer and service-rate proof), SHA-256 `22eaef2fe975e3b464ab77278c1a3c73614ae17b18cd0c516e8c6660b565f920`.
- All six other Edge functions retain their existing service token/public login roles. Do not blanket-enable/disable `verify_jwt` on them.
- A read-only production preflight in `docs/sql/n10_mfa_release_readonly_preflight.sql` passed 16/16 at review time; **rerun immediately before any approved deployment** because drift is possible.

## Pre-release blockers (every item mandatory)
1. Explicit scoped owner authorization for **each production write**: GitHub main, named Edge functions, SQL RLS/Storage/RPC transaction, and change window. This plan itself confers no authorization.
2. Obtain independent immutable recovery copies of pre-release GitHub main and the exact deployed source/metadata of all three named Edge functions; verify those copies can actually be redeployed. Preserve correct `verify_jwt` settings.
3. Obtain verified production database backup/snapshot with restore point or PITR coverage. Test separate retrieval/restore procedure. SQL-only undo is not equivalent to a full database backup.
4. Verify no changes to original 59 business table inventory, three private buckets, 11 original owner policies, wallet function signature/grants or involved Edge SHA-256/version; abort if drift occurs.
5. Verify controlled release/maintenance page that stops new sensitive user actions while backend and frontend versions differ. Do not expose a half-enabled MFA site.
6. Confirm real test accounts A and B, an enrolled MFA user and an unenrolled AAL1 user; do not ask users to submit passwords, secret recovery words or JWTs in chat.
7. Confirm HMAC keys will remain unchanged: `N10A740_RATE_HMAC_KEY` and recovery verifiers share rotation dependencies. Never rotate casually.
8. Complete authentic Staging Edge implementation integration for AI, Push and phrase endpoints, not only pure decision harnesses; verify dependency failures are safely rejected.

## Controlled deployment (ONLY after above approvals, in a single maintenance window)
1. Declare maintenance freeze and confirm users cannot perform sensitive writes while changing authorization layers. Capture current GitHub and Edge versions, production preflight results, and backups.
2. Deploy three **reviewed Edge MFA versions** preserving their distinct `verify_jwt` settings. Do not touch cron, public sign-up and other background token endpoints. Fail closed for any unknown factor inventory. Verify AAL1 rejection before any privileged read/push/phrase action; verify AAL2 allow.
3. Apply **one atomic transaction** from `docs/sql/n10_mfa_atomic_release_NOT_FOR_DEPLOYMENT.sql` only after explicit release approval, verifying the entire 59-policy, Storage and wallet guard change succeeds together. Never apply individual fragments out of sequence.
4. Deploy reviewed `login.html`, `app.html` and required JS/assets via an owner-approved merge/deploy. Verify the complete login/Google/recovery/MFA modal flow and that the direct app route cannot bypass enforcement.
5. Execute `docs/sql/n10_mfa_release_postflight_READ_ONLY.sql` and require every check true. Test enrolled AAL1 denied, enrolled AAL2 allowed, unenrolled AAL1 allowed, cross-UID denied, private Storage, wallet mutation only on disposable synthetic assets, signed URL TTL and safe notifications. Capture redacted results.
6. Remove maintenance only after all checks pass and rollback owner confirms the new state is stable. Monitor user access, finance import/transactions, push and AI for regressions. Never reuse production finance records for destructive QA.

## Mandatory rollback protocol, if any post-release gate fails
1. Enter/retain maintenance freeze; stop privileged user actions **before** altering security guards. Do not relax RLS with live users accessing out-of-date Edge/frontends.
2. Redeploy exact pre-change versions of the three Edge functions using stored source, config and versioned metadata; revert GitHub to the snapshot SHA only in an authorized controlled release.
3. Run `docs/sql/n10_mfa_atomic_rollback_NOT_FOR_DEPLOYMENT.sql` as the guarded all-or-nothing SQL rollback with a known-good backup and rollback operator present. It restores original wallet body and removes only tagged new policies; it **retains the helper** until dependencies are confirmed gone.
4. Verify original 59 ownership policies and 11 Storage policies still exist, wallet function body/owner/grants match baseline, real finance rows are unchanged, and direct API access has not been accidentally broadened. Release maintenance only after security regression.
5. Previously issued signed links may remain usable until expiry/cache end; a database rollback does not revoke links. Do not rotate signing keys without its own impact analysis and explicit approval.

## Evidence so far and scope limit
- Auth-issued **Staging** JWT acceptance 17/17 PASS (RLS, RPC, private QA Storage, three isolated Edge decision modes).
- Isolated staging wallet deletion semantics 9/9 PASS.
- Full 59-table/mock private-storage/wallet SQL atomic deploy and rollback in a single outer ROLLBACK transaction PASS.
- Responsive login browser regression 36/36 PASS with mocked auth/Edge.
- **Still not a production-shaped full Edge integration acceptance.** The production Edge implementations are not deployed in staging, and the final production dry run is not complete.
- Fixes after this review: corrected the Push candidate's malformed Bearer regex by delegating to a tested parser; AI and phrase gates fail closed for missing factor arrays.

**Release decision:** HOLD — no production authorization, no merging PR #1.
