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

ROLLBACK;
