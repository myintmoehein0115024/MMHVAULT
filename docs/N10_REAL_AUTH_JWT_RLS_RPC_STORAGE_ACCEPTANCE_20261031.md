# N10 — Real Auth-issued JWT security acceptance (isolated staging)
**Date:** 2026-10-31 (Thailand time)  
**Environment:** Auth Staging `ldivswlhtgmznzwhzsoi` only.  
**Evidence:** User-supplied screenshot of `MMHVAULT-Auth-QA/n10-mfa-stage.html` stage 03/04, plus independent read-only catalog queries after test. No sensitive token, QR or TOTP value is recorded.

## User-confirmed observed results
Stage 03 showed `PASS · Auth-issued JWT AAL2, UID matched, verified factor`.
Stage 04 showed **11 / 11 PASS** using Auth-issued AAL1 and AAL2 from the same test account:

| Requirement | User page evidence | Result |
|---|---|---|
| Enrolled AAL1 blocked by RLS | HTTP 200, 0 rows | PASS |
| Same user AAL2 reads owned synthetic row | HTTP 200 | PASS |
| Enrolled AAL1 blocked by privileged QA RPC | HTTP 403 | PASS |
| AAL2 privileged QA RPC owner access | HTTP 200 | PASS |
| AAL2 different UID rejected by privileged QA RPC | HTTP 403 | PASS |
| Enrolled AAL1 Storage upload rejected | HTTP 400 | PASS |
| AAL2 Storage upload accepted | HTTP 200 | PASS |
| AAL2 private file retrieval allowed | HTTP 200 | PASS |
| AAL1 private file retrieval rejected | HTTP 400 | PASS |
| AAL1 private file delete rejected | HTTP 400 | PASS |
| AAL2 test file cleanup accepted | HTTP 200 | PASS |

Non-2xx Storage rejection is expected for the tested API; a `200 []` on a SELECT with RLS is also expected. These outcomes are from the screenshot and the self-reported page; no raw JWTs were collected.

## Independent server read-only verification (post test)
- `storage.objects` contains **0** files in private QA bucket `mmh-n10-qa-private`.
- QA fixture remains exactly **4 synthetic rows**, QA bucket remains **private** and present, and Staging has **1 verified MFA factor**.
- QA public table has an owner PERMISSIVE SELECT policy + restrictive MFA SELECT policy.
- QA storage.objects has owner PERMISSIVE ALL + restrictive MFA ALL policies.
- The synthetic QA fixture (table, private bucket, RPC and MFA helper) is deliberately left in **Staging only** for repeatable verification; no production tables or finance data are involved.
- Do not drop the bucket or its storage.objects metadata using SQL; use Storage API for bucket lifecycle if later cleaning fixtures.

## What the PASS does NOT prove
1. Production's **59 business tables** and three actual private buckets have not had the proposed MFA guard deployed. The Staging QA test validates the *pattern*, not the deployed production policies.
2. Production's actual wallet deletion RPC, financial AI/Push privileged endpoints, and any service-role bypass paths require separate review/rollout gate.
3. Existing signed URLs and non-RLS endpoints are not revoked merely by adding Storage restrictive policies.
4. The live app's final signup, password reset, OAuth, login modal and two-account financial regression need production-like E2E before release.
5. **PR #1 remains Draft** and no permission to merge or deploy main, production DB, DNS, RLS, or finance data was provided in this test.

## Recommended next phase
Perform a release dry run against a production-shaped isolated staging schema and independent rollback, including candidate 59-table policy inventory, actual wallet RPC signature and Storage operation paths. Capture backups and verify the rollback. Then request scoped and explicit authorization before changing production resources.

Current decision: **REAL SIGNED-JWT SECURITY FIXTURE ACCEPTANCE: PASS. PRODUCTION RELEASE: NOT YET APPROVED.**
