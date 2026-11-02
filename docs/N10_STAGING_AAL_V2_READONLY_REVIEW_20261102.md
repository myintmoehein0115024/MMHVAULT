# MMHVAULT N10 — Staging Vault AAL V2 guarded upgrade review

**Date:** 2026-11-02  
**Branch:** `feature/n10-staging-aal-guard-review-20261102`  
**Status:** DRAFT, READ-ONLY / NO MIGRATION AUTHORIZED / NO DEPLOY / NO MERGE.

## Result of read-only live Staging metadata audit
This is based on actual catalog inspection, not on assumptions or guessed user data.

- Staging project: `ldivswlhtgmznzwhzsoi`.
- Private schema `mmh_n10_privacy` already has `recovery_backup_index` and `recovery_rate_bucket`. Both have RLS enabled; `anon`, `authenticated` and `service_role` lack **direct SELECT** access.
- `recovery_backup_index.user_id` has a primary key and an `auth.users(id) ON DELETE CASCADE` foreign key. `secret_id` is UNIQUE; a `mmh_n10_recovery_secret_gc` deletion trigger exists.
- Supabase Vault extension `supabase_vault` v0.3.1 is installed in the `vault` schema.
- Service-role-only RPCs exist: `backup_put(uuid,text)`, `backup_get(uuid)`, `backup_exists(uuid)`, `take_attempt(text,integer,integer)`; no anonymous or authenticated EXECUTE grants.
- **Defect blocking the new viewer:** only the old `mmh_n10_recovery_session_active(uuid,uuid)` function is installed. Its observed body checks the owner session ID and expiry, **not session AAL or a current verified MFA factor**.
- The candidate Vault Edge in Draft PR #11 calls `mmh_n10_recovery_session_active(uuid,uuid,text)`. This exact overload **does not exist in Staging**, so it must never be enabled prematurely.
- A previous read-only Production audit found **no N10 Vault RPCs**, so this candidate cannot be interpreted as a production-ready rollout.

## What these review-only files do
1. `docs/sql/n10_staging_aal_v2_READ_ONLY_PREFLIGHT_20261102.sql`: harmless read-only catalog inspection. It never queries actual users' passwords, phrases or session tokens.
2. `docs/sql/n10_staging_aal_v2_BLOCKED_REVIEW_20261102.sql`: **unconditionally raises an exception at the beginning and ends with ROLLBACK**. It is deliberately NOT an executable migration. The following source documents a possible three-argument overload, with no DROP/REPLACE of the legacy overload and service-only EXECUTE access.
3. `security/n10-staging-aal-review/synthetic-aal-guard.mjs` and tests: synthetic account/session/MFA examples only. These do not access live Auth, Vault or accounts.
4. `.github/workflows/n10-staging-aal-v2-review.yml`: syntax/tests and exact six-file allowlist. NO deploy secrets, SQL application, Auth or Edge calls.

## Required new security semantics
- Owner ID and session ID must BOTH match a live session, with `not_after` not expired.
- **AAL1**: session assurance must be `aal1`, no linked session MFA factor and no currently verified MFA factor on this user.
- **AAL2**: session assurance must be `aal2` and the session factor must exist, belong to the same user and be currently `verified`.
- Unknown expected level, another user's session/factor, expired/deleted session, incomplete MFA, malformed schema, or missing service permission must **fail closed**.
- No key is regenerated, modified or disclosed by this SQL example.
- The two-argument RPC is retained in the **review specimen**, but a subsequent approved rollout must decide when/how to retire or revoke it safely after checking callers. Do not leave legacy access paths available by accident.

## Impact and final release blockers
This GitHub-only review has **no database or production impact**. No real user, financial entry, Auth setting, Vault record, RLS, Edge function, login page, `app.html`, `login.html`, Landing or SEO file is changed.

A future *separately approved* Staging migration must:
- Re-run read-only preflight against the exact target project before any DDL and compare with this known schema. **Never replay the FIRST-INSTALL SQL** in Draft PR #11 against already initialized Staging.
- Generate a different, explicitly Staging-scoped, deployable migration with a visible rollback plan and clear approval. The SQL review specimen is deliberately never to be applied.
- Confirm new overload permissions and existence from metadata after install; confirm old 2-arg callers are known before considering retirement.
- Execute signed two-account AAL1/AAL2 tests, password proof, MFA addition/removal, session revocation, cross-account failure, Vault owner isolation, encryption read-back and carefully scoped synthetic signup rollback.
- Ensure username signup in Draft PR #50 escrows the **original** ten words **before** declaring success; viewing in Draft PR #43 only displays exactly those saved words.
- Recheck latest `main` and independent PR #2, #11, #37, #43, #50 before any merge, avoid shared `app.html` and APP V11 conflicts, and obtain fresh explicit owner approval for each stage.

**Do not share recovery words, JWTs, password, QR secret or service-role keys in bug reports or ChatGPT messages.**

## 2026-11-02 — live read-only readiness gate

An additional `SELECT`-only catalog gate was added to `n10_staging_aal_v2_READ_ONLY_PREFLIGHT_20261102.sql` and **actually executed against Staging** without DDL or record mutations:

| Read-only safety property | Result |
| --- | --- |
| Three-argument session + AAL guard exists | **FALSE** |
| Three-argument guard is restricted to service-role only | **FALSE** (guard absent) |
| Private backup-index table exists | TRUE |
| Supabase Vault extension exists | TRUE |
| All four Vault-related RPCs have service-only EXECUTE | TRUE |
| Both private backup/rate tables have RLS and deny ordinary SELECT | TRUE |
| Overall schema verdict | **`HOLD__DO_NOT_ENABLE_RECOVERY_VIEW`** |
| Signed two-owner MFA QA | **NOT RUN** |
| Production rollout permission | **NOT AUTHORIZED** |

Aggregate-only read of synthetic staging account prerequisites: **2 dedicated username-only test accounts**, **0 with verified MFA**, **0 with AAL2 sessions**, **0 with encrypted original recovery-word backup**. This is *not* a signed account test, and no account IDs, words, passwords or tokens were accessed.

Even after a future schema-only gate passes, the verdict is only `SCHEMA_PRECHECK_OK__SIGNED_TWO_OWNER_MFA_QA_STILL_REQUIRED` and **never** grants permission to deploy or reveal words. The new offline unit tests explicitly fail closed if any catalog requirement is missing.

**No staging or production write occurred in this review.** A narrowly scoped request for permission to install a separately reviewed three-argument Staging-only guard can be considered later, subject to actual schema and rollback checks. Do not deploy this hard-blocked review SQL.
