-- N10 Auth-Staging QA table minimal privileges — REVIEW ONLY / DO NOT RUN.
-- Target solely Auth-Staging project ldivswlhtgmznzwhzsoi; never production.
-- Current role "authenticated" has explicit INSERT/UPDATE/DELETE grants on
-- public.mmh_n10_signed_qa_entries, but RLS defines only SELECT policies.
-- Current RLS therefore denies actual authenticated mutations. This future
-- change removes redundant grants as defense in depth without touching data.
-- Separate scoped authorization and rollback/QA caller review are required.
BEGIN;
DO $gate$
BEGIN
 IF NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class c
         WHERE c.oid='public.mmh_n10_signed_qa_entries'::regclass)
    OR (SELECT count(*) FROM pg_catalog.pg_policy p
        WHERE p.polrelid='public.mmh_n10_signed_qa_entries'::regclass)<>2
    OR NOT EXISTS(
        SELECT 1 FROM pg_catalog.pg_policy p
        WHERE p.polrelid='public.mmh_n10_signed_qa_entries'::regclass
          AND p.polname='mmh_n10_qa_owner_select'
          AND p.polcmd='r' AND p.polpermissive)
    OR NOT EXISTS(
        SELECT 1 FROM pg_catalog.pg_policy p
        WHERE p.polrelid='public.mmh_n10_signed_qa_entries'::regclass
          AND p.polname='mmh_n10_qa_mfa_select'
          AND p.polcmd='r' AND NOT p.polpermissive)
    OR NOT has_table_privilege('authenticated',
      'public.mmh_n10_signed_qa_entries','SELECT')
    OR has_table_privilege('anon',
      'public.mmh_n10_signed_qa_entries','SELECT') THEN
    RAISE EXCEPTION 'N10 QA preflight failed: schema or RLS drift';
 END IF;
END;
$gate$;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.mmh_n10_signed_qa_entries
  FROM authenticated;
DO $post$
BEGIN
 IF has_table_privilege('authenticated','public.mmh_n10_signed_qa_entries','INSERT')
    OR has_table_privilege('authenticated','public.mmh_n10_signed_qa_entries','UPDATE')
    OR has_table_privilege('authenticated','public.mmh_n10_signed_qa_entries','DELETE')
    OR NOT has_table_privilege('authenticated','public.mmh_n10_signed_qa_entries','SELECT')
    OR NOT has_table_privilege('service_role','public.mmh_n10_signed_qa_entries','SELECT') THEN
   RAISE EXCEPTION 'N10 QA post-check failed: privilege drift';
 END IF;
END;
$post$;
COMMIT;
-- This does NOT change MFA factors, QA lock, Edge code, schema RLS,
-- user session data, recovery phrases, Vault or finance records.
-- To restore exact prior ACL in a separately approved rollback:
-- GRANT INSERT, UPDATE, DELETE ON TABLE public.mmh_n10_signed_qa_entries
--   TO authenticated; (NOT to be executed without distinct approval).
