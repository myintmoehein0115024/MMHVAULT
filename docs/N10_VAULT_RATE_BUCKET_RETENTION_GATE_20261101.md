# N10 Vault privacy retention — review-only decision gate

Status: OPEN / NOT DEPLOYABLE. Date: 2026-11-01. This file is a design and acceptance checklist, NOT a migration, operational permission or proof of deletion.

## Confirmed risk
The FIRST-INSTALL-only SQL candidate creates `mmh_n10_privacy.recovery_rate_bucket(bucket,attempts,reset_at)`. `bucket` is a keyed HMAC of user-scoped input. Rows have no owner FK, and `take_attempt` updates windows but has no expiration deletion. Therefore expired hashed buckets may remain indefinitely; deleting an Auth user does not automatically remove them. Treat hashes as potentially linkable pseudonymous operational data, not as anonymous data. Do not assert GDPR/privacy compliance or complete erasure.

## Safe future design (NOT approved to execute)
- Define and approve a proportionate fixed retention grace period for expired windows, documented in a privacy notice. Normal request authorization must NEVER depend on a background cleanup having already run; expired windows are reset by the quota function.
- Design an independently reviewed, least-privilege, bounded-batch expiry prune targeting `reset_at` before the retention threshold; do not log bucket contents and do not expose an authenticated/anon RPC.
- If immediate per-user erasure is required, account for the nonreversible HMAC bucket mapping: one cannot reliably find all of a deleted user's bucket values by scanning a foreign-key-less table. Prefer a future schema design with an explicitly documented owner mapping and a deletion policy, with access restricted to the backend and row existence tested against synthetic users. Assess whether mapping introduces new sensitive linkability.
- Assess integer attempts overflow and table growth under adversarial load. Document rate limits, quotas, monitoring and vacuum/index impacts.
- Do not modify the existing Staging schema in place or apply the FIRST-INSTALL candidate: installed objects already exist and may have drift. First obtain an approved schema diff and rollback strategy.

## Required evidence before any release
1. Approved retention/erasure policy, including whether account deletion is immediate versus scheduled.
2. Signed-off SQL design that preserves service-only authorization and RLS; review `SECURITY DEFINER` search paths and all grants.
3. Explicitly authorized, isolated synthetic-data E2E demonstrating expired-row cleanup, active-row preservation, account deletion semantics, concurrency, and idempotency; no real private rows or decrypted recovery words.
4. Independent verification that Vault secret deletion leaves no orphaned encrypted rows; trigger existence alone is not evidence.
5. Fresh signed JWT MFA AAL1/AAL2 exact-service acceptance and full CI on the final commit; QA gate currently LOCKED and must not be bypassed.

This review does not change release flags, secrets, SQL, Auth, live QA, financial data or production behavior.
