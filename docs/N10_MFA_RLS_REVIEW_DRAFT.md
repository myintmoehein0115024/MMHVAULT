# N10 — MFA Server Authorization Review (DRAFT / NOT EXECUTED)

## Scope and authorization

This file is a **review plan, not an executed migration**. The user authorized creating only `n10-qa.html` on the production site's `main`. They have **not** authorized changes to production Supabase RLS, auth services, financial data or security switches. No SQL in this file may be applied to production absent an explicit, separate approval and a restore plan.

## Verified read-only findings (2026-10-30)

- Project `vrypucmyrztxgiqhjspd`: `public` contains **210 existing policies spanning 59 tables**; all 59 of those tables have RLS enabled.
- None of those 210 policies directly references JWT `aal` / `authenticator_assurance_level`.
- Representative `transactions`, `investments`, `budgets` and `financial_goals` policies rely on owner UID equality for SELECT/INSERT/UPDATE/DELETE; this verifies tenant separation, **not** MFA enforcement.
- `auth.mfa_factors` contains `user_id`, `factor_type`, and `status`. Role `authenticated` has `auth` schema usage, but **does not have SELECT permission** on `auth.mfa_factors`. The official opt-in MFA example's direct SELECT from `auth.mfa_factors` therefore cannot simply be copied as-is to this project.
- Controlled QA test account successfully registered TOTP and passed a fresh AAL1 → AAL2 challenge. This is an Auth test, **not** proof of RLS denial.
- The username recovery Edge function grants AAL1 via an OTP-like sign-in path. RLS is thus required even when the login UI prompts for a second factor.

## Required behavioral contract

| Account state | JWT AAL | Database row access |
|---|---|---|
| No verified MFA factors | aal1 | Allowed subject to existing UID policies |
| No verified MFA factors | aal2 | Allowed subject to existing UID policies |
| One or more verified MFA factors | aal1 / missing AAL | **Denied**, including SELECT and all writes |
| One or more verified MFA factors | aal2 | Allowed subject to existing UID policies |
| Signed out / another user's UID | any | Denied per existing tenant RLS |

Only `verified` factors count; unverified setup must not lock the user out. Existing permissive ownership policies must remain unchanged. Existing service-role processes and admin functions need separate review, because privileged roles may bypass RLS.

## Proposed approach (STAGING / REVIEW ONLY)

Implement `mmh_n10_security.mfa_access_ok()` in a **non-exposed schema** with a narrowly scoped `SECURITY DEFINER` and `SET search_path = ''`, owned by an audited role that can read `auth.mfa_factors`. It checks only the currently authenticated subject's factor existence and signed JWT AAL; it must return no factor details. Grant schema USAGE and the function's EXECUTE to `authenticated` only. Do not expose the schema in the Data API. This use of SECURITY DEFINER is exceptional because the role cannot query MFA factors directly; review ownership and grants carefully before use.

Suggested function *for sandbox review* (do not execute in production):

```sql
-- DRAFT; NOT APPROVED; NO PRODUCTION EXECUTION
create schema if not exists mmh_n10_security;
revoke all on schema mmh_n10_security from public, anon;
grant usage on schema mmh_n10_security to authenticated;

create or replace function mmh_n10_security.mfa_access_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (
      (select auth.jwt()->>'aal') = 'aal2'
      or not exists (
        select 1
        from auth.mfa_factors as f
        where f.user_id = (select auth.uid())
          and f.status::text = 'verified'
      )
    );
$$;

revoke all on function mmh_n10_security.mfa_access_ok() from public, anon;
grant execute on function mmh_n10_security.mfa_access_ok() to authenticated;

-- On a verified staging copy ONLY, after capturing policy rollback:
create policy mmh_n10_mfa_access_guard
on public.transactions
as restrictive
for all
to authenticated
using ((select mmh_n10_security.mfa_access_ok()))
with check ((select mmh_n10_security.mfa_access_ok()));
```

**Critical review items before any execution:**
- Secure the owner of the SECURITY DEFINER function (expected `postgres`) and ensure the function can query `auth.mfa_factors` without leaking factor identities.
- Use a schema not listed in exposed Supabase Data API schemas; recheck whether RLS evaluation can resolve the helper for authenticated and all policy contexts.
- Record an accurate catalog snapshot of ALL policies before rollout. Confirm restrictive `FOR ALL` does not break SELECT/INSERT/UPDATE/DELETE, PostgREST upserts, background services, SECURITY DEFINER RPCs, or storage policies.
- Test in staging with dedicated non-sensitive rows and test accounts, not the user's real financial rows.
- One-table `transactions` staging tests are **not sufficient** for release: the protection must cover each sensitive RLS table, storage bucket, view and privileged RPC/API that exposes private financial content. Review non-`public` storage and other exposed schemas.
- Test JWT refresh / signout, enrollment and unenrollment, stale sessions after factor removal, recover-by-ten-words, email/Google OAuth, multiple factors, and AAL downgrade.
- Check for local/offline cached financial data: an RLS change cannot revoke information already cached on a device.

## Rollback (STAGING ONLY, upon approval)

```sql
drop policy if exists mmh_n10_mfa_access_guard on public.transactions;
-- Only if the helper is unused by all other policies:
drop function if exists mmh_n10_security.mfa_access_ok();
-- Drop schema only after proving it is empty.
```

For production, the rollback must be generated from and reconciled with the **real prechange policy snapshot**, not copied blindly from this illustration.

## Gate

- [x] Read-only RLS audit complete
- [x] Isolated username register/password/recovery and MFA TOTP test results confirmed by user
- [x] Official Supabase guide's restrictive-RLS mechanism verified against PostgreSQL docs
- [ ] Function signature, privileges and policy behavior validated in a disposable staging environment
- [ ] Negative AAL1 REST requests **denied** for MFA-enrolled test account
- [ ] Positive AAL2 REST requests **allowed** and UID cross-account requests denied
- [ ] Every private data access path inventoried
- [ ] User authorizes production migration separately
- [ ] Backups, maintenance window, rollback rehearsal and production acceptance

Official references:
- https://supabase.com/docs/guides/auth/auth-mfa
- https://www.postgresql.org/docs/current/sql-createpolicy.html
