-- N10 Auth-Staging — V2 session guard upgrade CANDIDATE / DO NOT EXECUTE.
-- Standalone versioned UPGRADE, NOT the first-install schema.
-- Intended ONLY for project ldivswlhtgmznzwhzsoi after independent approval.
-- No database-derived project identity is trusted: operator must select and
-- verify the exact Staging project in the tool connection BEFORE any execution.
-- Hard gate: QA remains LOCKED and recovery-release flag OFF.
-- READ-ONLY EXTERNAL CALLER AUDIT (2026-11-01) FOUND A BLOCKER:
-- Deployed Staging Edge "mmh-n10-qa-joint-mfa-vault-20261101" still calls
-- the 2-argument legacy RPC. It is currently disabled by release OFF, expired
-- QA window and empty allowlist, but must be formally retired or migrated in
-- a separately authorized, reviewed deployment BEFORE this migration runs.
-- Catalog-only dependency checks cannot detect these HTTP Edge callers.
-- Requires owner-approved maintenance window, external Edge caller audit,
-- preflight, change-specific approval, backups and defined rollback.
-- The prior 2-arg RPC has weaker semantics; retire it atomically, never leave
-- it as a public or service-role fallback. No Vault, user or financial DML.
BEGIN;
DO $gate$
DECLARE
 v_old oid := to_regprocedure('public.mmh_n10_recovery_session_active(uuid,uuid)');
 v_src text;
 v_privileged boolean;
 v_owner name;
 v_dependents integer;
BEGIN
 IF v_old IS NULL OR
    to_regprocedure('public.mmh_n10_recovery_session_active(uuid,uuid,text)') IS NOT NULL THEN
   RAISE EXCEPTION 'N10 V2 guard preflight: missing legacy or V2 already installed';
 END IF;
 SELECT p.prosrc,p.prosecdef,pg_get_userbyid(p.proowner),(
   SELECT count(*)::integer
   FROM pg_catalog.pg_depend d
   WHERE d.refobjid=p.oid AND d.deptype IN ('n','a')
 )
 INTO v_src,v_privileged,v_owner,v_dependents
 FROM pg_catalog.pg_proc p WHERE p.oid=v_old;
 IF md5(v_src) <> '4778bf3220e2faf29af54186c226e3ed'
    OR v_privileged IS DISTINCT FROM true
    OR v_owner <> 'postgres'
    OR v_dependents <> 0
    OR has_function_privilege('anon',v_old,'EXECUTE')
    OR has_function_privilege('authenticated',v_old,'EXECUTE')
    OR NOT has_function_privilege('service_role',v_old,'EXECUTE') THEN
   RAISE EXCEPTION 'N10 V2 guard preflight: unexpected installed schema or grants';
 END IF;
 IF to_regclass('mmh_n10_privacy.recovery_backup_index') IS NULL
    OR to_regclass('auth.sessions') IS NULL
    OR to_regclass('auth.mfa_factors') IS NULL
    OR to_regnamespace('mmh_n10_qa_security') IS NULL THEN
   RAISE EXCEPTION 'N10 V2 guard preflight: required Staging objects absent';
 END IF;
END;
$gate$;

CREATE FUNCTION public.mmh_n10_recovery_session_active(
 p_user_id uuid,p_session_id uuid,p_expected_aal text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM auth.sessions AS s
  WHERE s.id=p_session_id
    AND s.user_id=p_user_id
    AND (s.not_after IS NULL OR s.not_after>now())
    AND (
     (p_expected_aal='aal1'
      AND s.aal::text='aal1'
      AND s.factor_id IS NULL
      AND NOT EXISTS(
       SELECT 1 FROM auth.mfa_factors AS f
       WHERE f.user_id=p_user_id AND f.status::text='verified'
      ))
     OR
     (p_expected_aal='aal2'
      AND s.aal::text='aal2'
      AND s.factor_id IS NOT NULL
      AND EXISTS(
       SELECT 1 FROM auth.mfa_factors AS f
       WHERE f.id=s.factor_id AND f.user_id=p_user_id
         AND f.status::text='verified'
      ))
    )
 );
$$;
-- DEFAULT PUBLIC EXECUTE is revoked in the same transaction as creation.
REVOKE ALL ON FUNCTION public.mmh_n10_recovery_session_active(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_session_active(uuid,uuid,text)
 TO service_role;
-- No CASCADE. Any dependency causes full transaction rollback.
DROP FUNCTION public.mmh_n10_recovery_session_active(uuid,uuid) RESTRICT;
COMMIT;

-- Post-migration read-only checks (separate authorized operation):
--   legacy 2-arg signature absent; V2 3-arg signature present
--   authenticated/anon EXECUTE=false; service_role EXECUTE=true
--   server-managed session / factor AAL invariants tested using approved
--   NEW synthetic accounts and signed JWTs. Metadata-only CI is insufficient.
-- Do not run this file in production or while existing QA Edge callers use
-- the old signature. Do not activate the QA service as part of this change.
