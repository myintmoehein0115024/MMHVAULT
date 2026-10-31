# MMHVAULT N10 — Wallet privileged deletion RPC transaction QA
**Date:** 2026-10-31. **Scope:** isolated Auth Staging only (project `ldivswlhtgmznzwhzsoi`).

## Important fix to release rollback
A review of three previously prepared rollback fragments found malformed PL/pgSQL terminators: `END` was not followed by `;` before the dollar-quoted DO end tag. The exact original PostgreSQL wallet function definition had also been copied without appending the SQL statement terminator after the closing `$function$`. These would cause rollback SQL parser errors.

Corrected:
- `n10_mfa_wallet_rpc_rollback_CANDIDATE.sql`
- `n10_mfa_storage_rollback_CANDIDATE.sql`
- `n10_mfa_policy_rollback_CANDIDATE.sql`
- Rebuilt `n10_mfa_atomic_rollback_NOT_FOR_DEPLOYMENT.sql` from the corrected fragments, retaining its original 59-policy release-marker preflight.
- Added regression assertions for valid PL/pgSQL and function statement terminators and atomic bundle parity.

**These files are review-only.** They have not been applied to production. The corrected atomic rollback has not yet been exercised end-to-end on a full production-shaped deployment.

## Wallet functional acceptance — 9/9 PASS
Created `docs/sql/n10_wallet_rpc_transactional_staging_qa.sql`, using the exact wallet MFA candidate function body with only schema/table/helper names redirected to isolated Staging QA fixtures. The QA SQL was run once and returned `cases=9, all_pass=true`.

| Synthetic check | Result |
|---|---|
| Enrolled account AAL1 denied by privilege guard | PASS |
| Failed AAL1 attempt preserves row and linked records | PASS |
| Enrolled account AAL2 cannot delete other account's row | PASS |
| Enrolled AAL2 can delete its own wallet movement | PASS |
| Owned linked investment and both linked transactions deleted | PASS |
| Foreign-account movement and related transaction untouched | PASS |
| Unenrolled legacy account AAL1 can delete its own synthetic row | PASS |
| No-user-identity invocation rejected | PASS |
| Anonymous EXECUTE privilege not granted on test function | PASS |

### Scope and evidence
- The test used **simulated `request.jwt.claims`** in a Postgres transaction; these are NOT signed JWTs and do not replace the previous genuine Auth-issued 17/17 staging checks.
- The QA schema, synthetic wallet tables, function, and test outcomes were **rolled back in the same transaction**. A separate read-only Staging query confirmed the QA schema is absent, private QA object count remains 0 and the four original synthetic QA rows remain unchanged.
- Production wallet tables `crypto_wallet_movements`, `investments`, and `transactions` were never mutated.
- Read-only review of production catalog found no custom wallet DELETE trigger. Existing crypto, investment and transaction triggers primarily attach to INSERT or UPDATE; associated foreign keys and cascades still require release validation on production-shaped fixtures.
- Original wallet `SECURITY DEFINER` function body was read-only compared and its parameters/signature checked.

## Remaining release gates
1. End-to-end syntactic and behavioral rehearsal of the **entire** atomic database release and rollback in a production-shaped isolated environment, including 59 table policies and original Storage rules.
2. Actual production Edge service bodies need rollout and signed token checks; the 17/17 staging JWT acceptance only exercised an isolated test harness.
3. Legacy signed links/caches require a revocation/expiry plan.
4. Final backup snapshots, launch/rollback sequencing, and **explicit separate production deployment permission** before merging PR #1 or writing to production.

**Status: isolated wallet RPC function behavior PASS; production release and full atomic rollback rehearsal remain pending.**
