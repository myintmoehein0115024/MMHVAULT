# N10 MFA isolated staging execution report — 2026-10-31

## Execution scope and authorization
User authorized isolated MFA test DDL in Supabase project `ldivswlhtgmznzwhzsoi`, with baseline snapshot and post-test removal; no existing auth tables or production changes. Used existing independent Auth Staging, not production `vrypucmyrztxgiqhjspd`.

## Pre-test catalog snapshot
- Public: 11 existing tables (all RLS); 3 policies on existing probe tables.
- No existing schema `mmh_n10_mfa_qa`, no existing `mmh_n10_security` helper.
- `auth.mfa_factors` had **0 verified factors**; never modified.
- Existing public policies: `mmh_n10a6_probe_select_own` on `mmh_n10a6_auth_owner_probe`, `mmh_a766_owner_select` on `mmh_n10a766_owner_probe`, `p995k_current_session_owner` on `mmh_p995k_session_protected_qa`.

## Operations performed
1. Applied migration `n10_mfa_qa_isolated_fixture_20261031` to create *only* new `mmh_n10_mfa_qa` schema, two synthetic tables `factor_fixture` and `private_rows`, two scoped SECURITY DEFINER functions (`live_mfa_ok` checking actual read-only `auth.mfa_factors` and `fixture_mfa_ok` reading only QA factor fixture), and four permissive owner RLS policies plus one restrictive guard on the QA table.
2. Inserted **two synthetic fixed UUID fixture rows** with verified=true/false in the QA factor table and one synthetic protected row per UID.
3. Used `SET LOCAL ROLE authenticated` + `request.jwt.claims` in rollback-wrapped SQL statements to exercise restrictive RLS behavior. These are **JWT-context simulations**, not Auth-issued signed tokens.
4. Applied migration `n10_mfa_qa_isolated_fixture_cleanup_20261031`: `DROP SCHEMA mmh_n10_mfa_qa CASCADE`. The entire schema was created by this run.
5. Post-cleanup catalog SQL returned schema_count=0, public_table_count=11, public_policy_count=3, verified_factors=0, matching pre-test observations.

## Observed test matrix — synthetic SQL context
| Case | fixture helper | protected visible rows | Expected | Result |
|---|---:|---:|---|---|
| enrolled fixture AAL1 | false | 0 | deny | PASS |
| enrolled fixture AAL2 | true | 1 own, 0 other | own allow, cross-UID deny | PASS |
| unenrolled fixture AAL1 | true | 1 own, 0 other | own allow | PASS |
| enrolled fixture missing AAL | NULL | 0 | deny | PASS at RLS level, helper API needs boolean hardening |
| another UID AAL2 | true | 0 | cross-account deny | PASS |

Additional rollback-wrapped UPDATE and DELETE combined requests returned no modified/deleted row for enrolled AAL1, while AAL2 and unenrolled AAL1 returned their own fixture UUID. INSERT, UPSERT, storage, REST and real privileged RPC not tested; combined write statements do not isolate each operation's semantics.

**Important correctness discovery:** draft helper can return SQL NULL for missing AAL with an enrolled account. RLS treats NULL as denial in policy predicates, but a hardened release helper should wrap its boolean result in `coalesce(...,false)` and test the explicit false output. The live helper returned TRUE for simulated enrolled AAL1 because staging has **no verified actual auth MFA factors**; this is expected, and demonstrates that the live enrolled-path is still unverified, not a pass.

## Outstanding blockers — no claims of full certification
- Actual enrolled MFA factor + Auth-issued signed AAL1/AAL2 REST requests: NOT TESTED.
- INSERT, UPSERT, direct REST Storage signed-url issuance/download/upload/delete and privileged SECURITY DEFINER RPC checks: NOT TESTED.
- Full production table inventory, views, Edge paths and service-role exceptions: NOT secured by this experiment.
- Branch login E2E and mobile/desktop acceptance still pending.
- Do not deploy helper, database migration, login merge, or other production changes without separate explicit authorization and rollback.

## Cleanup verification
- PASS: isolated QA schema fully gone.
- PASS: original 11 public tables and 3 policies remain; factor count unchanged.
- No existing auth tables, normal public objects, finance data, production RLS or production secrets were changed.
