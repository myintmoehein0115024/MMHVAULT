# MMHVAULT N10 — E/F Staging Independent Safety Review Packet
**Date:** 2026-11-04 (UTC)  
**Status:** REVIEW ONLY / NOT AN EXECUTION OR RELEASE APPROVAL  
**Environment:** Supabase Auth Staging `ldivswlhtgmznzwhzsoi` only. Production `vrypucmyrztxgiqhjspd` is strictly excluded.

## 1. Purpose and source baseline

Seek an **independent, supported safety-review decision** on the previously blocked, isolated E/F Staging backend migration. A GitHub approval, this document, a test passing, and a user request to "continue" are **not** substitutes for that independent safety decision.

Source reviewed:
- N10 Draft PR [#74](https://github.com/myintmoehein0115024/MMHVAULT/pull/74), candidate HEAD at packet preparation: `0b2a7f25f319dcf71fec1492dc1d466624b68ff4`. Never merge as part of this review.
- GitHub latest `main` when checked: `09e00eb48b76e98f8100bd3e202d91a9f5b88086`.
- Exact candidate under hold: `security/n10-v2-qa/staging_real_ef_backend_NOT_AUTHORIZED.sql`. The prior platform security denial remains effective.
- Review-only Edge candidates: `staging_real_ef_signup_REVIEW_ONLY.ts` and `staging_real_ef_viewer_REVIEW_ONLY.ts`, currently hard-disabled.
- Final-head CI [41826760762](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41826760762) and [41826751706](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41826751706): both SUCCESS. These tests are synthetic/static and do **not** establish actual signed Auth/MFA acceptance.

## 2. Confirmed Staging-only read-only facts (2026-11-04 12:14 UTC)

Checked through supported Supabase project, Security Advisor and Edge listing/source-reading APIs; **no SQL execution, Auth mutation, database change or deployment** was performed for this packet.

- Staging project `ldivswlhtgmznzwhzsoi` is `ACTIVE_HEALTHY`. Production was not inspected or modified.
- The deployed `mmh-n10-realef-signup-staging-20261104` is still **V1** with `verify_jwt=false` (public registration entry), code `RELEASE_ENABLED=false`, expiry `1970-01-01T00:00:00.000Z`.
- The deployed `mmh-n10-realef-viewer-staging-20261104` is still **V1** with `verify_jwt=true`, the same hard-OFF release flag and 1970 expiry.
- These V1 deployed sources are **not** the Draft improvements. An Edge deployment being listed `ACTIVE` does not mean its E/F release gate is open.
- Supabase Security Advisor returned `auth_leaked_password_protection` **WARN**: leaked-password detection is disabled in Staging. No Auth setting change is authorized by this packet. See [password security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Security Advisor returned `authenticated_security_definer_function_executable` **WARN** for public `mmh_is_admin()`, callable by the `authenticated` role. Its intent, authorization checks and ownership require a **separate administrator/Analytics review**; the finding alone does not prove exploitation. **Do not modify this shared function from N10.** See [security-definer advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Security Advisor returned `rls_enabled_no_policy` **INFO** for 25 tables across multiple schemas. Some intentionally private tables use deny-by-default access and may need no policies; classification requires privilege review, not automatic grants. See [RLS advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- No new counts of real E/F `auth.users`, bindings or backup rows were taken during this packet. **Previously recorded** last read-only baseline was 0/0/0 real E/F, two synthetic E/F backup indexes, four historical A/B/C/D backup joins. These historical numbers are not a fresh guarantee.

## 3. Blocked migration: decision needed (no execution)

The existing candidate file proposes eight E/F-only privileged functions and isolated private state. Although the candidate text includes a single transaction, restricted RPC EXECUTE grants and preflight assertions, its use of `SECURITY DEFINER` in an exposed API schema and its Auth/Vault side effects merit independent review.

The previously blocked SQL must **not** be retried, divided into statements, copied to a dashboard, run through another connector, or executed by other means. This packet contains **no SQL payload** and authorizes no migration.

An independent reviewer should determine, without executing the denied operation:
1. Whether the isolated E/F migration can be authorized for the *identified Staging project only*, with a documented decision and an approved change-control method.
2. Whether service-role-only EXECUTE revocations, effective function ownership and absence of public/anon/authenticated invocation are enforceable.
3. Whether immutable one-time E/F claims, initial encrypted-escrow write/readback, session ownership and TOTP AAL2 checks adequately protect existing A/B/C/D and synthetic E/F data.
4. Whether abort/reconciliation steps are safe if Auth user creation, Vault persistence, MFA or session revocation fails partway through.
5. Whether there are any unacceptable interactions with shared auth schemas, public RPCs or the separate Analytics administration module.

If safety review is denied, **keep both Edge gates OFF and PR #74 Draft**. Do not switch methods or targets.

## 4. Separate approvals and real acceptance gates

No single approval implicitly authorizes other stages:

| Gate | Action | Current status |
| --- | --- | --- |
| A | Independent supported safety decision for the previously blocked Staging backend | **BLOCKED — no approval** |
| B | Separate approval for isolated E/F-only backend/Edge activation and short-lived testing | **NOT AUTHORIZED** |
| C | Real signed E and F registration, original encrypted ten-word escrow before first session, login and verified TOTP AAL2 | **NOT TESTED** |
| D | Cross-owner, session revocation, malformed Auth response, wrong-password, gated expiry and original-key Recovery Viewer real checks | **NOT TESTED** |
| E | Verify A/B/C/D and synthetic E/F unchanged; shut test gates, revoke temporary sessions, independently reconcile unresolved failures | **NOT TESTED** |
| F | PR #74 merge, Production migration, Production Edge release | **NOT AUTHORIZED; separate Production review required** |

CI/static/synthetic suites can support a review decision but do not substitute for gates C–E. Scoped Auth sign-out removes refresh capability for a session, but an issued JWT may survive until expiration: **sensitive server paths must check the original `session_id` against live `auth.sessions`** and revalidate the authenticated owner/AAL2 after asynchronous reads.

## 5. Explicit hold and preserved data

- **Never** modify or inspect Production data under this packet.
- **Never** delete/reset A/B/C/D accounts, backup indexes, original recovery phrases, or synthetic E/F fixtures.
- **Never** rotate or regenerate an original ten-word phrase when recovery retrieval fails.
- **Never** reuse an ambiguous E/F one-shot claim to create a replacement account without a separately reviewed reconciliation decision.
- **Never** enable `RELEASE_ENABLED`, extend its expired deadline, deploy a candidate or merge PR #74 as part of the safety review.
- No shared Landing, APP V11, Analytics, or unrelated Supabase changes are within N10 scope.

## 6. Review outcome to record

Only an authorized, independent reviewer can resolve Gate A. The review result should identify the exact Staging project, applicable migration candidate revision, permitted change-control method, any necessary remediation, ownership and rollback/reconciliation strategy, and any separate approval requirements.

**Current result: HOLD. Independent safety approval has not been obtained; real E/F Auth/MFA/Recovery acceptance and Production release remain unproven/unapproved.**
