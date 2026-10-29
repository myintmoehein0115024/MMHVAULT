-- MMHVAULT N10-A7.52 — READ-ONLY scoped pre/post snapshot.
-- Run via Supabase SQL editor ONLY after verifying the formal production project.
-- This script returns counts/booleans only. NEVER returns UIDs, usernames,
-- email addresses, passwords, tokens, Secret values or finance transactions.
-- Does not grant permissions or mutate anything.
SELECT
  now() AS audit_timestamp_utc,
  (SELECT count(*)::int FROM public.mmh_n10a740_username_links) AS username_links_count,
  (SELECT count(*)::int FROM public.mmh_n10a740_attempt_buckets) AS rate_buckets_count,
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')) AS public_tables_count,
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity) AS public_tables_with_rls,
  (SELECT count(*)::int FROM pg_policies WHERE schemaname='public'
    AND tablename IN ('mmh_n10a740_username_links','mmh_n10a740_attempt_buckets')) AS private_table_policy_count,
  (SELECT prosecdef FROM pg_proc
    WHERE oid='public.mmh_n10a740_take_attempt(text,integer,integer)'::regprocedure) AS limiter_security_definer,
  has_table_privilege('anon','public.mmh_n10a740_username_links','SELECT') AS anon_can_read_username,
  has_table_privilege('authenticated','public.mmh_n10a740_username_links','SELECT') AS user_can_read_username,
  has_function_privilege('anon','public.mmh_n10a740_take_attempt(text,integer,integer)','EXECUTE') AS anon_can_use_limiter,
  has_function_privilege('authenticated','public.mmh_n10a740_take_attempt(text,integer,integer)','EXECUTE') AS user_can_use_limiter;
