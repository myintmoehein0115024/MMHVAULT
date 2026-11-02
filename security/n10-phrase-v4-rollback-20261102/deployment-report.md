# MMHVAULT N10 — Recovery phrase verifier Edge v5 production rollout

**Date:** 2026-11-02; **authorized scope:** the single existing production
Edge `mmh-n10a783-phrase-verify` in project
`vrypucmyrztxgiqhjspd`. User previously gave a broad approval to
continue the staged N10 rollout, including the next phrase-verification phase.
All operations in this record were isolated to this one Edge and source-only
GitHub review/rollback files.

## Before the single-function deployment

- Original production function: **ACTIVE v4**, `verify_jwt=false`,
  SHA256 `bf46fc4db6496d41fba9b4828a96f4342f8315d704e6e1ea39da24960737360d`.
- Both exact production source files were archived on this branch as
  `index.ts` and `mfa-assurance.mjs`, then compared byte-for-byte with
  unchanged live v4 immediately before the production update.
- Frozen review PR #33 head `a038ea0af161c2262f9bb06c15b910e3e43a41d0`;
  offline push CI `41432562318` and PR CI `41432570742` both
  **SUCCESS**, including 10 pure AAL decisions, 20 synthetic handler cases,
  five-file source-only audit and Deno type-check.
- Source uses the same verified service-role bearer, server-owned Auth
  factor inventory, MFA steps and previous response codes. The sole
  authorization flag difference was
  `CANDIDATE_RELEASE_ENABLED=false` (review) to `true` (authorized
  production runtime).
- Missing `aal` in Auth-validated JWT is treated as AAL1 per the current
  official [Supabase MFA guide](https://supabase.com/docs/guides/auth/auth-mfa).
  Verified MFA enrollment still requires AAL2.

## After deployment (read-only verification)

- Production function **ACTIVE v5**; `verify_jwt=false` preserved;
  SHA256 `e2d139dcb77a05888868dc0bbb44047756ae54fff210200268529118c886910d`.
- Read back `index.ts` and `mfa-assurance.mjs`; both match reviewed
  candidate source exactly, except the explicitly authorized ON flag.
- Other active production Auth functions independently re-read and unchanged:
  - Username binding v3 SHA256
    `af87a20046e0a1a857f43ec45ef12fe8acf659345c8544adcd44d83fd98a20a2`
  - Username sign-in v8 SHA256
    `238d1cf1b92440501e82e6a0b2fb3ea827f4168c3bb190ab5863930f850d6057`.
- No production App/login/Landing, GitHub main, SQL schema, RLS,
  Auth account data, financial data, secrets, Vault or Staging QA
  function were changed by this operation.

## Follow-up and rollback

- **A successful source deployment is not a real signed end-to-end user
  validation.** Genuine two-user MFA/recovery, wrong-key and revoked-session
  tests remain unperformed; treat that as a limitation and follow up
  using only authorized user-owned accounts.
- User-side visual smoke check: sign in with an existing username-only
  account, visit Settings / Password & Devices / Recovery Key, confirm
  it opens without unexpected sign-out and requires enrolled MFA
  where applicable. Do not share password, MFA code, QR or ten-word key.
- Rollback **only after a fresh live fingerprint check** confirms this
  exact v5 is still deployed and the rollback is authorized: redeploy
  the two archived original v4 files to only
  `mmh-n10a783-phrase-verify` with `verify_jwt=false`; verify
  returned status/version and exact original source. If any
  post-deployment updates have changed the fingerprint, stop
  and reconcile—never force an old version onto unrelated work.
- Do **not** merge Draft PR #33 or the old composite PR #37 merely to
  activate this Edge; the reviewed candidate remains hard-OFF in Git.
