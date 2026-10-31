# N10 — Full atomic RLS, Storage and wallet release/rollback rehearsal

**Date:** 2026-10-31 · **Environment:** `ldivswlhtgmznzwhzsoi` isolated Auth Staging · **Production unchanged**

## Executed, not simulated SQL parsing

Staging executed the exact N10 atomic release/rollback candidate SQL mechanically rewritten to isolated QA namespaces in one transaction. Script: `docs/sql/n10_atomic_release_rollback_isolated_staging_qa.sql`.

- Synthetic QA business schema `mmh_n10_release_qa` mirrors the **59 targeted business tables + 5 deny-all infrastructure tables** (64 total), all with RLS enabled.
- Separate synthetic Storage schema `mmh_n10_release_qa_storage` holds **three mock bucket records** and an isolated `objects` table. Real `storage.buckets` / `storage.objects` were **not changed**.
- Isolated helper `mmh_n10_release_qa_security.mfa_access_ok` reads existing Staging Auth factor state but changes no users or MFA factors.
- A synthetic wallet `SECURITY DEFINER` function starts with the exact pre-N10 body snapshotted in the reviewed rollback candidate.
- The migration creates **59 restrictive MFA policies** with the correct release marker, **1 private Storage restrictive policy** and the guarded wallet function. A database assertion verified all 61 release targets.
- The atomic rollback restores the original wallet function and removes the 59 business + 1 Storage policy. Database assertions checked zero remaining N10 policies, correct wallet function body/marker and unchanged synthetic table inventory.
- The **entire SQL execution ended with `ROLLBACK`**. The tool returned `restrictive_business_policies_tested:59`, `storage_guard_tested:1`, `wallet_function_tested:1`, `release_and_rollback_verified:true`, `outer_transaction_rolled_back:true`.

An independent subsequent read-only query confirmed all three isolated QA schemas were absent and the previous Staging private test bucket still had **0** files.

## Bugs corrected before the rehearsal
1. The 59-table MFA policy migration candidate and original atomic release contained a missing PL/pgSQL semicolon (`END` versus `END;`) and would not parse correctly. Both candidates now have the corrected terminator.
2. The fixture initially placed mock bucket and objects metadata alongside the mock public table inventory; it was moved into a distinct isolated mock Storage schema, preserving the release's exact 64-table inventory invariant.
3. Added automated contract checks to ensure the staging test contains the same transformed release and rollback SQL and terminates with one outer `ROLLBACK;`. The GitHub static safety workflow watches the isolated QA script.

## Verified scope versus remaining risks
This is **a genuine PostgreSQL execution of transformed N10 candidates**, so it validates SQL syntax, object names, policy creation/markers, wallet replacement and rollback ordering. **It does not prove** that the physical production database has the same dependent triggers, grants, signed URLs, frontend session lifecycle or service-role pathways. The fake Storage objects do not exercise the Storage HTTP server; prior real JWT Storage tests used a separate independent QA bucket.

The isolated wallet linked-delete behavior was separately verified 9/9 with synthetic rows and simulated SQL JWT claims; the independent signed-JWT staging E2E was 17/17 against QA objects.

## Outstanding release gates
- Actual production-shaped Edge function integration and rollback using nonproduction Auth, including AI and Push with their dependencies (not just the synthetic 6-mode decision function).
- Release sequencing between live Edge, private signed URLs/cache TTL, frontend and RLS, including a way to safely disable privileged endpoints if rollback becomes necessary.
- Final true multi-account/user-flow checks for username signup/recovery, Google OAuth, refresh, and finance data isolation.
- Owner-approved production change window, pre-deployment backup, live 16-check preflight, and post-deployment read-only MFA inventory. **No production deployment is authorized by this rehearsal.**

**Decision: full isolated atomic SQL release/rollback REHEARSAL PASS; PR #1 remains Draft.**
