-- MMHVAULT N10 — INSTALLED Auth-Staging privacy/Vault metadata audit.
-- READ ONLY. Not a migration; not an authorization to unlock QA or deploy.
-- Run ONLY after verifying the intended Auth-Staging project ID:
-- ldivswlhtgmznzwhzsoi. Tables and pg_cron must already be installed.
-- NO recovery words, decrypted secrets, passwords, user IDs or bucket hashes read.
-- Live deletion behavior requires separately authorized synthetic-account tests.
SELECT
  (SELECT count(*)::integer
   FROM mmh_n10_privacy.recovery_backup_index) AS backup_index_rows,
  (SELECT count(*)::integer
   FROM vault.secrets s
   WHERE s.name LIKE 'mmh_n10_fixed_recovery_%') AS n10_vault_secret_rows,
  (SELECT count(*)::integer
   FROM vault.secrets s
   WHERE s.name LIKE 'mmh_n10_fixed_recovery_%'
     AND NOT EXISTS (
       SELECT 1 FROM mmh_n10_privacy.recovery_backup_index i
       WHERE i.secret_id=s.id
     )) AS currently_unlinked_n10_secret_rows,
  (SELECT count(*)::integer
   FROM mmh_n10_privacy.recovery_rate_bucket
   WHERE reset_at <= now()) AS expired_rate_bucket_rows,
  (SELECT count(*)::integer
   FROM mmh_n10_privacy.recovery_rate_bucket
   WHERE reset_at > now()) AS active_rate_bucket_rows,
  EXISTS(
   SELECT 1
   FROM pg_catalog.pg_trigger t
   JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
   JOIN pg_catalog.pg_namespace fn ON fn.oid=p.pronamespace
   WHERE n.nspname='mmh_n10_privacy'
     AND c.relname='recovery_backup_index'
     AND t.tgname='mmh_n10_recovery_secret_gc'
     AND t.tgenabled='O'
     AND fn.nspname='mmh_n10_privacy'
     AND p.proname='cleanup_recovery_vault_secret'
  ) AS vault_delete_trigger_enabled,
  EXISTS(
   SELECT 1 FROM pg_catalog.pg_constraint c
   WHERE c.conrelid='mmh_n10_privacy.recovery_backup_index'::regclass
     AND c.contype='f'
     AND c.confrelid='auth.users'::regclass
     AND c.confdeltype='c'
  ) AS owner_delete_cascades,
  EXISTS(
   SELECT 1 FROM cron.job
   WHERE jobname='n10-staging-recovery-rate-bucket-expired-cleanup'
     AND active
     AND command='DELETE FROM mmh_n10_privacy.recovery_rate_bucket WHERE reset_at < now() - interval ''1 day'''
  ) AS daily_rate_cleanup_job_enabled,
  NOT has_function_privilege(
   'authenticated','public.mmh_n10_recovery_backup_get(uuid)','EXECUTE'
  ) AS no_authenticated_secret_rpc_access,
  NOT has_function_privilege(
   'anon','public.mmh_n10_recovery_backup_get(uuid)','EXECUTE'
  ) AS no_anon_secret_rpc_access,
  NOT has_schema_privilege('authenticated','vault','USAGE')
    AS no_authenticated_vault_schema_access,
  NOT has_schema_privilege('anon','vault','USAGE')
    AS no_anon_vault_schema_access,
  NOT has_table_privilege('authenticated','vault.decrypted_secrets','SELECT')
    AS no_authenticated_decrypted_view_select,
  NOT has_table_privilege('anon','vault.decrypted_secrets','SELECT')
    AS no_anon_decrypted_view_select,
  NOT has_table_privilege('authenticated','vault.secrets','SELECT')
    AS no_authenticated_raw_vault_select,
  NOT has_table_privilege('anon','vault.secrets','SELECT')
    AS no_anon_raw_vault_select;
-- Zero unlinked secrets only describes the current snapshot, not proof
-- that account deletion cascades remove Vault ciphertext under real load.
-- Active cron job only proves scheduling, not a successfully completed run.
