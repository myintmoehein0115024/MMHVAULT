-- N10 STAGING V2 SESSION/AAL GUARD — CODE REVIEW EXAMPLE ONLY.
-- THIS FILE IS GUARDED AND ENDS WITH ROLLBACK: IT CANNOT INSTALL ANYTHING.
-- NOT APPROVED TO RUN. Before a real release, produce a separately approved,
-- staging-pinned migration with observed pre/post checks and a rollback plan.
-- Never replay the old FIRST-INSTALL Vault schema against populated Staging.
BEGIN;
SET LOCAL statement_timeout = '10s';

-- Unconditional HARD BLOCK. Do not remove or bypass in this review PR.
DO $n10_never_execute$
BEGIN
  RAISE EXCEPTION 'N10 STAGING V2 REVIEW ONLY: database changes NOT authorized';
END
$n10_never_execute$;

-- Example-only preflight of the existing installed Staging structure.
DO $n10_schema_checks$
DECLARE
  legacy_oid oid;
BEGIN
  SELECT p.oid INTO legacy_oid
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='mmh_n10_recovery_session_active'
    AND pg_catalog.pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_session_id uuid';
  IF legacy_oid IS NULL THEN
    RAISE EXCEPTION 'Staging-only legacy 2-argument guard is absent';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname='mmh_n10_recovery_session_active'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_session_id uuid, p_expected_aal text'
  ) THEN
    RAISE EXCEPTION '3-argument guard already exists: stop and reconcile';
  END IF;
  IF (SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid=legacy_oid) IS DISTINCT FROM TRUE
    OR has_function_privilege('anon',legacy_oid,'EXECUTE')
    OR has_function_privilege('authenticated',legacy_oid,'EXECUTE')
    OR NOT has_function_privilege('service_role',legacy_oid,'EXECUTE')
  THEN
    RAISE EXCEPTION 'Legacy permissions differ: stop';
  END IF;

  IF pg_catalog.to_regclass('mmh_n10_privacy.recovery_backup_index') IS NULL
    OR pg_catalog.to_regclass('mmh_n10_privacy.recovery_rate_bucket') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname='supabase_vault')
  THEN
    RAISE EXCEPTION 'Missing private encrypted-backup dependencies';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema='auth' AND table_name='sessions'
        AND column_name IN ('id','user_id','aal','factor_id','not_after'))<>5
    OR (SELECT count(*) FROM information_schema.columns
      WHERE table_schema='auth' AND table_name='mfa_factors'
        AND column_name IN ('id','user_id','status'))<>3
  THEN
    RAISE EXCEPTION 'Auth schema mismatch: stop';
  END IF;
END
$n10_schema_checks$;

-- Future separate migration would ADD a 3-argument overload.
-- Do not change/drop/replace the existing 2-argument function in this review.
CREATE FUNCTION public.mmh_n10_recovery_session_active(
  p_user_id uuid, p_session_id uuid, p_expected_aal text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path=''
AS $n10_new_guard$
  SELECT EXISTS (
    SELECT 1 FROM auth.sessions AS s
    WHERE s.id=p_session_id
      AND s.user_id=p_user_id
      AND (s.not_after IS NULL OR s.not_after>now())
      AND (
        (p_expected_aal='aal1'
         AND s.aal::text='aal1'
         AND s.factor_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM auth.mfa_factors AS f
           WHERE f.user_id=p_user_id AND f.status::text='verified'
         ))
        OR
        (p_expected_aal='aal2'
         AND s.aal::text='aal2'
         AND s.factor_id IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM auth.mfa_factors AS f
           WHERE f.id=s.factor_id
             AND f.user_id=p_user_id
             AND f.status::text='verified'
         ))
      )
  );
$n10_new_guard$;

REVOKE ALL ON FUNCTION public.mmh_n10_recovery_session_active(uuid,uuid,text)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_session_active(uuid,uuid,text)
  TO service_role;

-- Hard cancellation even if an operator extracts/pastes around the first
-- unconditional block. This document is never a deployment migration.
ROLLBACK;
