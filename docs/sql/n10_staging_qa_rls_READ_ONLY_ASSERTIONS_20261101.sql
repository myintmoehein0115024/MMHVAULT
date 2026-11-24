-- N10 Auth-Staging QA RLS audit — SELECT ONLY, REVIEW ONLY.
-- Requires explicit correct Staging connection ldivswlhtgmznzwhzsoi.
-- No Auth session/token contents, emails, user identifiers or financial rows.
-- The QA SELECT must compose ONE owner PERMISSIVE policy and ONE MFA
-- RESTRICTIVE policy; two permissive policies would mean OR, not AND.
WITH qa_table AS (
 SELECT c.oid,c.relrowsecurity,c.relforcerowsecurity
 FROM pg_catalog.pg_class c
 WHERE c.oid='public.mmh_n10_signed_qa_entries'::regclass
),
pol AS (
 SELECT p.polname,p.polpermissive,p.polcmd,
        pg_catalog.pg_get_expr(p.polqual,p.polrelid) AS expression,
        (SELECT array_agg(pg_catalog.pg_get_userbyid(x)::text)
         FROM unnest(p.polroles) AS r(x)) AS roles
 FROM pg_catalog.pg_policy p
 WHERE p.polrelid='public.mmh_n10_signed_qa_entries'::regclass
),
expectations AS (
 SELECT
 (SELECT relrowsecurity FROM qa_table) AS rls_enabled,
 (SELECT count(*) FROM pol)=2 AS exactly_two_select_policies,
 (SELECT count(*) FROM pol
  WHERE polname='mmh_n10_qa_owner_select'
   AND polpermissive AND polcmd='r'
   AND roles @> ARRAY['authenticated']::text[]
   AND expression LIKE '%user_id%'
   AND expression LIKE '%auth.uid()%')=1 AS owner_permissive,
 (SELECT count(*) FROM pol
  WHERE polname='mmh_n10_qa_mfa_select'
   AND NOT polpermissive AND polcmd='r'
   AND roles @> ARRAY['authenticated']::text[]
   AND expression LIKE '%mmh_n10_qa_security.mfa_ok()%')=1 AS mfa_restrictive,
 (SELECT count(*) FROM pol WHERE polcmd<>'r')=0 AS no_mutating_rls_policies,
 NOT has_table_privilege('anon','public.mmh_n10_signed_qa_entries','SELECT')
  AS anon_has_no_direct_read,
 EXISTS (
  SELECT 1 FROM pg_catalog.pg_proc p
  WHERE p.oid='mmh_n10_qa_security.mfa_ok()'::regprocedure
   AND p.prosecdef
   AND p.prosrc LIKE '%auth.uid()%'
   AND p.prosrc LIKE '%auth.jwt()%'
   AND p.prosrc LIKE '%auth.mfa_factors%'
 ) AS mfa_guard_validates_uid_and_factors,
 NOT has_function_privilege('authenticated',
   'public.mmh_n10_qa_privileged_read(uuid)','EXECUTE') AS no_authenticated_qa_privileged_rpc,
 NOT has_function_privilege('anon',
   'public.mmh_n10_qa_privileged_read(uuid)','EXECUTE') AS no_anon_qa_privileged_rpc
)
SELECT *,
  (rls_enabled AND exactly_two_select_policies AND owner_permissive
   AND mfa_restrictive AND no_mutating_rls_policies
   AND anon_has_no_direct_read AND mfa_guard_validates_uid_and_factors
   AND no_authenticated_qa_privileged_rpc AND no_anon_qa_privileged_rpc)
    AS all_checks_pass
FROM expectations;
-- Snapshot of policy structure only; does not replace signed-user QA tests.
-- The intended MFA policy accepts AAL1 only when the user has no verified
-- factors. Do not label this as strict AAL2-only access.
