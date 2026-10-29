-- N10-A7.43 · PRODUCTION METADATA PREFLIGHT · READ ONLY
-- Do not insert, update, delete, create, alter, execute user functions or change roles.
-- Run in the production project's SQL editor only when explicitly approved.
-- Contains only SELECTs on schema catalog metadata; no account/user records.
-- Supabase target from prior authorized read-only audit: vrypucmyrztxgiqhjspd

-- 1. All public tables should have RLS enabled.
SELECT count(*)::int AS public_tables,
       count(*) FILTER (WHERE c.relrowsecurity)::int AS rls_enabled,
       count(*) FILTER (WHERE NOT c.relrowsecurity)::int AS rls_disabled
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p');

-- 2. Candidate username objects must not be assumed to already exist.
SELECT
  pg_catalog.to_regclass('public.mmh_n10a740_username_links') IS NOT NULL AS username_table_exists,
  pg_catalog.to_regclass('public.mmh_n10a740_attempt_buckets') IS NOT NULL AS attempt_bucket_exists,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='mmh_n10a740_take_attempt'
  ) AS rate_rpc_exists;

-- 3. Targeted ownership-policy metadata only; no user IDs or financial rows.
SELECT
  count(DISTINCT c.relname)::int AS targeted_tables,
  count(*) FILTER (WHERE p.policyname IS NOT NULL)::int AS policy_count,
  count(*) FILTER (WHERE p.policyname IS NOT NULL AND
    (coalesce(p.qual,'') || ' ' || coalesce(p.with_check,'')) LIKE '%auth.uid%')::int AS uid_referencing_policies,
  count(*) FILTER (WHERE p.policyname IS NOT NULL AND
    (coalesce(p.qual,'') || ' ' || coalesce(p.with_check,'')) ILIKE '%user_metadata%')::int AS user_metadata_referencing_policies,
  count(*) FILTER (WHERE p.cmd='UPDATE' AND p.with_check IS NULL)::int AS update_missing_explicit_check
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
LEFT JOIN pg_catalog.pg_policies AS p ON p.schemaname=n.nspname AND p.tablename=c.relname
WHERE n.nspname='public' AND c.relkind IN ('r','p')
  AND c.relname ~* '(account|transaction|invest|life|budget|fund|goal|habit|schedule|spend)';

-- 4. Relevant SECURITY DEFINER RPC metadata; do not invoke the RPC.
SELECT p.proname AS function_name,
       p.prosecdef AS security_definer,
       pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute,
       pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'mmh_delete_crypto_wallet_movement_v4',
  'mmh_n10a740_take_attempt'
)
ORDER BY p.proname;
