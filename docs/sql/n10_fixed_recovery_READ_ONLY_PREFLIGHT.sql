-- MMHVAULT N10 recovery Vault — READ-ONLY PREFLIGHT
-- No DDL, no users, secrets, recovery words, password hashes or financial rows.
-- Run against Staging before and after a separately approved migration.
-- Null privilege fields mean the function has not been installed.
WITH flags AS (
 SELECT
  to_regclass('mmh_n10_privacy.recovery_backup_index') AS idx,
  to_regclass('mmh_n10_privacy.recovery_rate_bucket') AS rates,
  to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text)') AS put,
  to_regprocedure('public.mmh_n10_recovery_backup_get(uuid)') AS get,
  to_regprocedure('public.mmh_n10_recovery_backup_exists(uuid)') AS exists_fn,
  to_regprocedure('public.mmh_n10_recovery_take_attempt(text,integer,integer)') AS quota,
  to_regprocedure('public.mmh_n10_recovery_session_active(uuid,uuid)') AS session_guard,
  to_regclass('public.mmh_n10a769_recovery_phrases') AS phrase_verifier,
  EXISTS(SELECT 1 FROM pg_extension WHERE extname='supabase_vault') AS vault_ready,
  to_regprocedure('vault.create_secret(text,text,text,uuid)') IS NOT NULL AS vault_create_signature_ok,
  EXISTS(SELECT 1 FROM information_schema.columns
         WHERE table_schema='auth' AND table_name='sessions'
           AND column_name='not_after') AS auth_session_expiry_column_ok,
  EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name='mmh_n10_privacy') AS private_schema_present
)
SELECT
 vault_ready, vault_create_signature_ok, auth_session_expiry_column_ok, private_schema_present,
 idx IS NOT NULL AS backup_index_present,
 rates IS NOT NULL AS rate_index_present,
 put IS NOT NULL AS put_rpc_present,
 get IS NOT NULL AS get_rpc_present,
 exists_fn IS NOT NULL AS status_rpc_present,
 quota IS NOT NULL AS quota_rpc_present,
 session_guard IS NOT NULL AS session_guard_rpc_present,
 phrase_verifier IS NOT NULL AS phrase_verifier_present,
 CASE WHEN phrase_verifier IS NOT NULL THEN
    (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid=phrase_verifier) END AS verifier_rls,
 CASE WHEN phrase_verifier IS NOT NULL THEN has_table_privilege('anon',phrase_verifier,'SELECT') END AS anon_can_read_verifier,
 CASE WHEN phrase_verifier IS NOT NULL THEN has_table_privilege('authenticated',phrase_verifier,'SELECT') END AS authenticated_can_read_verifier,
 CASE WHEN idx IS NOT NULL THEN (SELECT relrowsecurity FROM pg_class WHERE oid=idx) END AS backup_index_rls,
 CASE WHEN rates IS NOT NULL THEN (SELECT relrowsecurity FROM pg_class WHERE oid=rates) END AS rate_bucket_rls,
 CASE WHEN put IS NOT NULL THEN has_function_privilege('anon',put,'EXECUTE') END AS anon_can_put,
 CASE WHEN put IS NOT NULL THEN has_function_privilege('authenticated',put,'EXECUTE') END AS authenticated_can_put,
 CASE WHEN get IS NOT NULL THEN has_function_privilege('anon',get,'EXECUTE') END AS anon_can_read_key,
 CASE WHEN get IS NOT NULL THEN has_function_privilege('authenticated',get,'EXECUTE') END AS authenticated_can_read_key,
 CASE WHEN get IS NOT NULL THEN has_function_privilege('service_role',get,'EXECUTE') END AS service_can_read_key,
 CASE WHEN quota IS NOT NULL THEN has_function_privilege('anon',quota,'EXECUTE') END AS anon_can_quota,
 CASE WHEN quota IS NOT NULL THEN has_function_privilege('authenticated',quota,'EXECUTE') END AS authenticated_can_quota,
 CASE WHEN session_guard IS NOT NULL THEN has_function_privilege('anon',session_guard,'EXECUTE') END AS anon_can_check_session,
 CASE WHEN session_guard IS NOT NULL THEN has_function_privilege('authenticated',session_guard,'EXECUTE') END AS authenticated_can_check_session,
 CASE WHEN session_guard IS NOT NULL THEN has_function_privilege('service_role',session_guard,'EXECUTE') END AS service_can_check_session,
 CASE WHEN private_schema_present THEN has_schema_privilege('anon','mmh_n10_privacy','USAGE') END AS anon_private_usage,
 CASE WHEN private_schema_present THEN has_schema_privilege('authenticated','mmh_n10_privacy','USAGE') END AS authenticated_private_usage
FROM flags;
-- Release criteria after isolated migration:
-- vault_ready, vault_create_signature_ok, auth_session_expiry_column_ok, backup_index_present, rate_index_present, put/get/status/quota/session_guard:
--   true (and a synthetic verifier present or a separately approved fixture).
-- backup_index_rls/rate_bucket_rls true.
-- ALL anon/authenticated_* EXECUTE/USAGE fields false.
-- service_can_read_key and service_can_check_session true only for the dedicated privileged backend.
-- This query never checks the contents of vault.secrets/decrypted_secrets.
