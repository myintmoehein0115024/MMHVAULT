# N10 — Real JWT MFA Edge-gate acceptance harness

Date: 2026-10-31. Status: **ISOLATED STAGING EDGE FUNCTION DEPLOYED; SIGNED JWT ACCEPTANCE PENDING USER RUN.**

## Isolated environment and safeguards
- Auth Staging only: `ldivswlhtgmznzwhzsoi`. Production `vrypucmyrztxgiqhjspd` unchanged.
- Dedicated function: `mmh-n10-qa-edge-mfa-20261031`, deployed v1 with `verify_jwt=true`.
- Source in separate `myintmoehein0115024/MMHVAULT-Auth-QA/n10-edge-mfa-qa/` repository.
- Function uses only Staging publishable Auth key and requires both Supabase Auth verified user and explicit JWT-aware MFA assurance. It never calls production, SQL, Storage, OpenAI, or privileged service-role endpoints.
- Only permits a response from the known QA GitHub Pages origin. Rejects invalid methods, modes and tokens. Returns minimal decision codes; no token, user UID, OTP, recovery phrase or finance data are returned or logged.
- Its `mfa-assurance.mjs` and `mfa-push.mjs` are **byte-identical** to the helpers in the N10 feature branch. The Push probe uses verified `auth.getUser()` factor data instead of the production Push candidate's direct privileged SQL query. That back-end SQL distinction remains a separate production release test.

## UI test procedure, one click
Independent `MMHVAULT-Auth-QA/n10-mfa-stage.html` stage 04 now includes the three Edge QA decisions alongside the prior 11 real JWT RLS/RPC/Storage checks, without requiring an additional panel.

After sign-in to an existing Staging account and Authenticator AAL2 verification, stage 04 compares the prior Auth-issued AAL1 and upgraded AAL2 bearer against each mode:
1. financial-ai: enrolled AAL1 must return 403 `MFA_REQUIRED`; AAL2 must return 200 `MFA_ALLOWED`.
2. push-test: same.
3. recovery-phrase: same.

**Expected total: 17/17 PASS**, including the previously confirmed 11/11 database/Storage/RPC checks, and automatic test-file cleanup. DO NOT submit raw JWT, OTP or passwords.

## Validation status
- Staging Edge Function v1 reported ACTIVE and `verify_jwt=true`.
- Source and QA page verified present, page's inline JavaScript syntax parsed successfully, all three modes wired.
- **No genuine AAL1/AAL2 request to the new QA Edge function has yet been observed.** An ACTIVE deploy and offline source check is NOT a PASS of these six authorization paths.
- The N10 production branch PR #1 remains Draft. No production database/Edge/login/main changes were authorized or made.
