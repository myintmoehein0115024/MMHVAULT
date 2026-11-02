-- N10 V2 AAL STAGING SCHEMA PREFLIGHT — READ ONLY.
-- Production and Staging writes are NOT authorized by this source.
-- Report only schema metadata (never user rows, secrets or session tokens).
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY;

SELECT n.nspname AS schema_name,
       p.proname AS function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS signature,
       pg_catalog.pg_get_function_result(p.oid) AS return_type,
       p.prosecdef AS security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_run,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS user_can_run,
       has_function_privilege('service_role',p.oid,'EXECUTE') AS service_can_run
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN (
    'mmh_n10_recovery_session_active',
    'mmh_n10_recovery_backup_put',
    'mmh_n10_recovery_backup_get',
    'mmh_n10_recovery_backup_exists',
    'mmh_n10_recovery_take_attempt')
ORDER BY p.proname,signature;

SELECT c.table_schema,c.table_name,c.column_name,c.udt_name,c.is_nullable
FROM information_schema.columns AS c
WHERE (c.table_schema='auth'
       AND c.table_name IN ('sessions','mfa_factors')
       AND c.column_name IN ('id','user_id','aal','factor_id','not_after','status'))
   OR (c.table_schema='mmh_n10_privacy'
       AND c.table_name IN ('recovery_backup_index','recovery_rate_bucket'))
ORDER BY c.table_schema,c.table_name,c.ordinal_position;

SELECT n.nspname,c.relname,c.relrowsecurity,
       has_table_privilege('anon',c.oid,'SELECT') AS anon_can_select,
       has_table_privilege('authenticated',c.oid,'SELECT') AS user_can_select,
       has_table_privilege('service_role',c.oid,'SELECT') AS service_can_select
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
WHERE n.nspname='mmh_n10_privacy' AND c.relkind='r'
ORDER BY c.relname;

SELECT e.extname,e.extversion,n.nspname AS extension_schema
FROM pg_catalog.pg_extension AS e
JOIN pg_catalog.pg_namespace AS n ON n.oid=e.extnamespace
WHERE e.extname='supabase_vault';

-- Fail-closed release gate: catalog-only metadata. This is NOT live MFA QA.
-- It reports the required 3-argument guard and service-only EXECUTE grant.
-- Do not treat catalog PASS as authorization to apply migrations or reveal words.
WITH guard AS (
  SELECT p.oid,p.prosecdef
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='mmh_n10_recovery_session_active'
    AND pg_catalog.pg_get_function_identity_arguments(p.oid)
      = 'p_user_id uuid, p_session_id uuid, p_expected_aal text'
), flags AS (
  SELECT
    EXISTS (SELECT 1 FROM guard) AS three_arg_guard_exists,
    EXISTS (
      SELECT 1 FROM guard AS g
      WHERE g.prosecdef
        AND NOT has_function_privilege('anon',g.oid,'EXECUTE')
        AND NOT has_function_privilege('authenticated',g.oid,'EXECUTE')
        AND has_function_privilege('service_role',g.oid,'EXECUTE')
    ) AS guard_service_only,
    pg_catalog.to_regclass('mmh_n10_privacy.recovery_backup_index') IS NOT NULL
      AS backup_index_exists,
    EXISTS (SELECT 1 FROM pg_catalog.pg_extension
            WHERE extname='supabase_vault') AS vault_present
)
SELECT three_arg_guard_exists,
       guard_service_only,
       backup_index_exists,
       vault_present,
       CASE
         WHEN three_arg_guard_exists AND guard_service_only
              AND backup_index_exists AND vault_present
           THEN 'SCHEMA_PRECHECK_OK__SIGNED_TWO_OWNER_MFA_QA_STILL_REQUIRED'
         ELSE 'HOLD__DO_NOT_ENABLE_RECOVERY_VIEW'
       END AS gate_result,
       'NOT_RUN__NEEDS_SEPARATE_APPROVED_SIGNED_TEST' AS signed_mfa_qa,
       'NOT_AUTHORIZED__NO_DEPLOYMENT' AS release_permission
FROM flags;

ROLLBACK;
