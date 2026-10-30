-- N10 MFA RLS policy candidate rollback — NEVER RUN WITHOUT AUTHORIZATION.
-- Only rolls back named policies created by the matching 59-table candidate.
-- Does NOT revert any other policy, grant, data, Storage or privileged RPC changes.
-- A production rollback must be separately rehearsed and coordinated with back-end
-- function changes to avoid opening an MFA bypass during a partial deployment.

BEGIN;
DO $n10$
DECLARE row_record record;
BEGIN
  FOR row_record IN
    SELECT schemaname, tablename
    FROM pg_policies
    WHERE schemaname='public' AND policyname='mmh_n10_mfa_required'
  LOOP
    EXECUTE format('DROP POLICY mmh_n10_mfa_required ON %I.%I',
       row_record.schemaname, row_record.tablename);
  END LOOP;
END
$n10$;
-- Intentionally retain the helper and schema: deployed RPC and Storage policies
-- may still reference the function. Only remove once dependency audits pass.
COMMIT;
