# N10 — Real JWT MFA Edge-gate acceptance harness

Date: 2026-10-31. Status: **ISOLATED STAGING REAL SIGNED-JWT ACCEPTANCE PASS — 17/17 AND EDGE 6/6**.

## Isolated environment and safeguards
- Auth Staging only: `ldivswlhtgmznzwhzsoi`. Production `vrypucmyrztxgiqhjspd` unchanged.
- Dedicated function: `mmh-n10-qa-edge-mfa-20261031`, revised through deployed v4 with `verify_jwt=true`.
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

**Observed total: 17/17 PASS**, including the previously confirmed 11/11 database/Storage/RPC checks, and automatic test-file cleanup. DO NOT submit raw JWT, OTP or passwords.

## Verification completed on 2026-10-31

The user supplied a screenshot of the Stage 04 real JWT acceptance page. The page shows **all 17/17 checks PASS** (RLS, privileged QA RPC, synthetic private Storage and six MFA decisions for the three Edge categories). The separate Edge-only panel also displays **6/6 PASS**, with each enrolled AAL1 call returning `HTTP 403 · MFA_REQUIRED` and each elevated AAL2 call returning `HTTP 200 · MFA_ALLOWED`.

Independent Staging Edge request logs for 08:34–08:48 UTC corroborate **6 HTTP 403** and **6 HTTP 200** application requests, plus 12 HTTP 204 CORS preflights, to the dedicated QA Edge function. No user credentials, raw JWTs, factor codes or private file data were copied into this report.

Read-only post-test database query confirms: **zero remaining QA Storage objects**, **four unchanged synthetic QA rows** and **one verified Staging MFA factor**. The dedicated QA Edge service remains ACTIVE, version 4, `verify_jwt=true`.

## Limits and next release gates

- The Edge PASS proves the **isolated Staging authorization-decision harness** using real Auth-issued signed tokens. It does **not** prove deployment or behavior of the three actual production Edge functions, which have different code and privileged dependencies. Their candidate patches are not deployed.
- The 11 remaining checks used dedicated Staging QA table/RPC/private bucket rather than production financial records.
- Production's real wallet RPC and all MFA protections for 59 finance/business tables and three actual private buckets are still candidate SQL only.
- The existing long-lived signed URLs already issued in production are not revoked by this test.
- Complete production-like frontend login/recovery/Google OAuth/multi-account regression, actual Edge integration rollback checks and scoped production deployment approval before merge.
- **PR #1 remains Draft and unmerged** as independently verified. No production database/Edge/login/main changes were made in this acceptance exercise.

**Release assessment: REAL STAGING JWT GATE ACCEPTED. PRODUCTION RELEASE NOT YET AUTHORIZED.**
