-- N10 conditional MFA gate candidate: REVIEW-ONLY, NEVER auto-apply to production.
-- Preconditions: explicitly approved migration, complete per-table inventory,
-- rollback snapshot, signed-token negative tests, verified function-owner privileges.
-- All sensitive surfaces MUST be separately enumerated before production rollout.

create schema if not exists mmh_n10_security;
revoke all on schema mmh_n10_security from public, anon;
grant usage on schema mmh_n10_security to authenticated;

create or replace function mmh_n10_security.mfa_access_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $body$
  select coalesce(
    auth.uid() is not null
    and (
      (auth.jwt() ->> 'aal') = 'aal2'
      or not exists (
        select 1
        from auth.mfa_factors as f
        where f.user_id = auth.uid()
          and f.status::text = 'verified'
      )
    ),
    false
  );
$body$;

revoke all on function mmh_n10_security.mfa_access_ok() from public, anon;
grant execute on function mmh_n10_security.mfa_access_ok() to authenticated;

-- Example FOR SYNTHETIC STAGING TABLE ONLY (do not run on production):
-- create policy mmh_n10_mfa_guard on qa_private_rows as restrictive
-- for all to authenticated
-- using ((select mmh_n10_security.mfa_access_ok()))
-- with check ((select mmh_n10_security.mfa_access_ok()));

-- Privileged SECURITY DEFINER RPC must independently call the guard at entry:
-- IF NOT mmh_n10_security.mfa_access_ok() THEN
--   RAISE EXCEPTION 'Second factor required' USING ERRCODE = '42501';
-- END IF;
-- Do not insert an untested guard into production wallet delete logic.
-- Never assume RESTRICTIVE policies cover privileged SECURITY DEFINER execution.
