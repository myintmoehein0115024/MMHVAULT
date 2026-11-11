-- N10 Staging AAL2 guard post-install verification — READ ONLY.
-- Staging project ldivswlhtgmznzwhzsoi ONLY. No secrets, user IDs or tokens.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY;

SELECT pg_catalog.pg_get_function_identity_arguments(p.oid) AS signature,
       md5(pg_catalog.pg_get_functiondef(p.oid)) AS source_fingerprint,
       p.prosecdef AS security_definer,
       p.proconfig AS settings,
       pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') AS user_execute,
       pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE') AS backend_execute
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname='mmh_n10_recovery_session_active'
ORDER BY signature;

-- These are fabricated UUIDs, not real accounts.
SELECT public.mmh_n10_recovery_session_active(
         '00000000-0000-0000-0000-000000000000'::uuid,
         '00000000-0000-0000-0000-000000000001'::uuid,'aal1') AS missing_aal1,
       public.mmh_n10_recovery_session_active(
         '00000000-0000-0000-0000-000000000000'::uuid,
         '00000000-0000-0000-0000-000000000001'::uuid,'aal2') AS missing_aal2,
       public.mmh_n10_recovery_session_active(
         '00000000-0000-0000-0000-000000000000'::uuid,
         '00000000-0000-0000-0000-000000000001'::uuid,'aal3') AS invalid_level;

-- Metadata-only output about dedicated staging accounts. No identifiers emitted.
WITH owners AS (
  SELECT id
  FROM auth.users
  WHERE raw_app_meta_data->>'mmhvault_auth_kind'='username_only_staging'
), staging_sessions AS (
  SELECT s.id,s.user_id,s.aal,
         public.mmh_n10_recovery_session_active(s.user_id,s.id,'aal1') AS pass_aal1,
         public.mmh_n10_recovery_session_active(s.user_id,s.id,'aal2') AS pass_aal2
  FROM auth.sessions s JOIN owners u ON u.id=s.user_id
), foreign_cases AS (
  SELECT o.id AS other_owner,s.id AS session_id
  FROM staging_sessions s CROSS JOIN owners o
  WHERE o.id<>s.user_id
)
SELECT
 (SELECT count(*) FROM owners) AS staging_accounts,
 (SELECT count(*) FROM staging_sessions) AS staging_sessions,
 (SELECT count(*) FROM staging_sessions WHERE pass_aal1) AS allowed_aal1,
 (SELECT count(*) FROM staging_sessions WHERE pass_aal2) AS allowed_aal2,
 (SELECT count(*) FROM foreign_cases) AS foreign_owner_cases,
 (SELECT count(*) FROM foreign_cases WHERE
   public.mmh_n10_recovery_session_active(other_owner,session_id,'aal1')
   OR public.mmh_n10_recovery_session_active(other_owner,session_id,'aal2')
  ) AS foreign_owner_allowed;

-- Current data count only. This test does not decrypt or write secrets.
SELECT (SELECT count(*) FROM mmh_n10_privacy.recovery_backup_index) AS encrypted_backup_rows,
       (SELECT count(*) FROM mmh_n10_privacy.recovery_rate_bucket) AS rate_bucket_rows;

ROLLBACK;
