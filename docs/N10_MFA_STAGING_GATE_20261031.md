# N10 server MFA staging gate — verified addendum (2026-10-31)

**Status: READ-ONLY AUDIT COMPLETED; NO DDL / NO PROD CHANGE / NOT RELEASE-READY.**

## Environment verification
- Production Supabase project: `vrypucmyrztxgiqhjspd`.
- Existing isolated Auth Staging project: `ldivswlhtgmznzwhzsoi` (ACTIVE_HEALTHY), not a production branch.
- Staging public: **11 tables, all RLS enabled**; tables predominantly N10 auth/throttle/probe infrastructure, **not** a cloned financial schema.
- Staging `auth.mfa_factors`: **0 verified factors** at inspection. Do not call this an AAL1/AAL2 test pass.
- Neither Supabase project currently lists any development branches.
- GitHub PR #1 is OPEN, DRAFT, mergeable, 31 commits ahead and 6 behind main; reverse compare finds only `n10-qa.html` added on main. No merge authorized.

## Confirmed privileged production bypass candidate
Read-only `pg_get_functiondef` shows `public.mmh_delete_crypto_wallet_movement_v4(p_id uuid)`:
- Owner = postgres; `SECURITY DEFINER`; search_path = `public`.
- Explicitly checks `auth.uid()`, and requires `crypto_wallet_movements.user_id = auth.uid()`.
- Deletes wallet movement and may delete linked investments and transactions.
- Does **not** test JWT AAL or factor enrollment. Therefore UID isolation does not meet the conditional MFA requirement; restrictive table RLS alone may not protect invocations by this definer.
- Require **direct helper guard at function entry**, then preserve all current ownership/foreign-key semantics and test using synthetic movements only; review search_path hardening, execute grants, and every other SECURITY DEFINER separately.

## Confirmed Storage policy coverage
All 11 production `storage.objects` policies were read via catalog. They cover:
- `receipts`: INSERT/SELECT/UPDATE/DELETE, UID-first-folder rules;
- `mmh-feedback`: INSERT/SELECT/DELETE, UID-folder or admin checks;
- `mmh-business-assets`: INSERT/SELECT/UPDATE/DELETE, UID-folder and PNG checks.
None of the policy expressions checks AAL. For private objects test signed URL issuance, download, upload, overwrite, delete, list, and cached or already-issued signed URLs. Check bucket publicity and route-specific auth separately. **Do not assume adding a single policy fixes admin and service-role bypass.**

## Proposed isolation experiment, NOT EXECUTED
Target project only: `ldivswlhtgmznzwhzsoi` — require separate approval before writing even there.

1. Capture staging schema, all grants/policies/function definitions, and MFA factor/auth fixtures. Verify that no existing real-user records are used.
2. Create dedicated synthetic `mmh_n10_mfa_guard_qa` table with RLS and explicit permissive user-owner policies, plus a restrictive guard. Create non-exposed `mmh_n10_security.mfa_access_ok()` as narrowly privileged SECURITY DEFINER. Enforce NULL/unknown AAL fail-closed when any verified factor exists. Check function owner, EXECUTE grants and immutability of `auth.uid()` assumption under JWT.
3. Create isolated test identities with and without verified TOTP factors using supported Auth flows (not by inserting fake auth rows). Test AAL1/AAL2 and denied wrong-UID read/write (SELECT, INSERT, UPDATE, DELETE, UPSERT), expired JWT, recovery path, signout and refresh.
4. For Storage, use dedicated private QA bucket and synthetic files, replay matching policy semantics and test raw REST routes plus signed-URL issuance. A pre-issued URL is a separate revocation limitation.
5. For SECURITY DEFINER, build a **synthetic stand-in**, not production deletion. Test direct entrypoint guard; separately draft production-safe wrapper/update without executing against real finances.
6. Only after all tests pass, make a per-surface production migration and rollback with privilege/policy snapshot, maintenance window, safe deployment order, log redaction, and explicit user authorization.

Expected matrix:
| Factor state | JWT | Synthetic owned row | Other user's row |
|---|---|---|---|
| none verified | AAL1 | ALLOW | DENY |
| verified TOTP | AAL1 / missing AAL | DENY | DENY |
| verified TOTP | AAL2 | ALLOW | DENY |
| verified TOTP | expired/invalid JWT | DENY | DENY |

## Rollback for approved staging experiment
- Keep a prechange snapshot and delete only explicitly named QA policies, synthetic test rows/bucket/table, QA definer and QA helper after confirming no dependencies.
- Never drop existing auth tables/policies or production schema.
- Production changes require a separately reviewed snapshot-driven migration; do not use the staging cleanup SQL as production rollback.

## Release gates still blocked
- [ ] Authorized staging DDL applied and independently verified
- [ ] Actual enrolled AAL1 DENY, AAL2 ALLOW, unenrolled AAL1 ALLOW, cross-user DENY
- [ ] All private tables and Storage paths + definer/RPC and Edge access audited
- [ ] Branch login E2E and desktop recovery dialogs
- [ ] Production backup and separate deployment approval

**Reminder:** front-end MFA modals and syntactic correctness never constitute server-side access control proof.
