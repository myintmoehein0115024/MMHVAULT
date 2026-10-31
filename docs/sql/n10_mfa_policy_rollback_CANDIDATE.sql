-- N10 MFA RLS policy candidate rollback — NEVER RUN WITHOUT AUTHORIZATION.
-- Only rolls back policies with the exact N10 marker created by the matching candidate.
-- Does NOT revert any other policy, grant, data, Storage or privileged RPC changes.
-- A production rollback must be separately rehearsed and coordinated with back-end
-- function changes to avoid opening an MFA bypass during a partial deployment.

BEGIN;
DO $n10$
DECLARE row_record record;
BEGIN
  FOR row_record IN
    SELECT n.nspname AS schemaname, c.relname AS tablename
    FROM pg_policy p
    JOIN pg_class c ON c.oid=p.polrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND p.polname='mmh_n10_mfa_required'
      AND obj_description(p.oid, 'pg_policy')='MMHVAULT-N10-MFA-RESTRICTIVE-V1'
  LOOP
    EXECUTE format('DROP POLICY mmh_n10_mfa_required ON %I.%I',
       row_record.schemaname, row_record.tablename);
  END LOOP;
END;
$n10$;
-- Intentionally retain the helper and schema: deployed RPC and Storage policies
-- may still reference the function. Only remove once dependency audits pass.
COMMIT;
