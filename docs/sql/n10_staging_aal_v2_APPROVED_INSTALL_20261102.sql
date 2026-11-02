-- MMHVAULT N10 Staging-only change authorised on 2026-11-02.
-- Project ref MUST equal ldivswlhtgmznzwhzsoi in the Supabase deployment tool.
-- Never run on production vrypucmyrztxgiqhjspd.
-- Single atomic DO statement: checks schema drift and legacy function fingerprint,
-- creates ONLY the new (uuid,uuid,text) overload and restricts EXECUTE to service_role.
-- NO user data, session, Auth config, Vault secrets, or existing RPCs are modified.
DO $n10_stage_install$
DECLARE
  old_oid oid;
  new_oid oid;
  check_count integer;
BEGIN
  SELECT p.oid INTO old_oid
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='mmh_n10_recovery_session_active'
    AND pg_catalog.pg_get_function_identity_arguments(p.oid)
       = 'p_user_id uuid, p_session_id uuid';

  IF old_oid IS NULL
     OR md5(pg_catalog.pg_get_functiondef(old_oid)) <> 'a9aff9c940d74a7a35134f84929334fd'
     OR (SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid=old_oid) IS DISTINCT FROM TRUE
     OR pg_catalog.has_function_privilege('anon',old_oid,'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated',old_oid,'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('service_role',old_oid,'EXECUTE')
  THEN
    RAISE EXCEPTION 'N10 staging guard drift: legacy function or grants differ, no changes applied';
  END IF;

  IF EXISTS(
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname='mmh_n10_recovery_session_active'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid)
         = 'p_user_id uuid, p_session_id uuid, p_expected_aal text'
  ) THEN
    RAISE EXCEPTION 'N10 staging AAL3 guard already exists: refusing overwrite';
  END IF;

  IF pg_catalog.to_regclass('mmh_n10_privacy.recovery_backup_index') IS NULL
     OR pg_catalog.to_regclass('mmh_n10_privacy.recovery_rate_bucket') IS NULL
     OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_extension WHERE extname='supabase_vault')
     OR (SELECT count(*) FROM information_schema.columns
         WHERE table_schema='auth' AND table_name='sessions'
           AND column_name IN ('id','user_id','aal','factor_id','not_after'))<>5
     OR (SELECT count(*) FROM information_schema.columns
         WHERE table_schema='auth' AND table_name='mfa_factors'
           AND column_name IN ('id','user_id','status'))<>3
  THEN
    RAISE EXCEPTION 'N10 staging Vault/Auth schema differs: refusing migration';
  END IF;

  SELECT count(*) INTO check_count
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND (
      (p.proname='mmh_n10_recovery_backup_put'
       AND pg_catalog.pg_get_function_identity_arguments(p.oid)='p_user_id uuid, p_phrase text')
      OR (p.proname='mmh_n10_recovery_backup_get'
       AND pg_catalog.pg_get_function_identity_arguments(p.oid)='p_user_id uuid')
      OR (p.proname='mmh_n10_recovery_backup_exists'
       AND pg_catalog.pg_get_function_identity_arguments(p.oid)='p_user_id uuid')
      OR (p.proname='mmh_n10_recovery_take_attempt'
       AND pg_catalog.pg_get_function_identity_arguments(p.oid)='p_bucket text, p_limit integer, p_window_seconds integer')
    )
    AND p.prosecdef
    AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    AND pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE');
  IF check_count<>4 THEN
    RAISE EXCEPTION 'N10 staging Vault RPC permissions drift: refusing migration';
  END IF;

  SELECT count(*) INTO check_count
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='mmh_n10_privacy'
    AND c.relkind='r'
    AND c.relname IN ('recovery_backup_index','recovery_rate_bucket')
    AND c.relrowsecurity
    AND NOT pg_catalog.has_table_privilege('anon',c.oid,'SELECT')
    AND NOT pg_catalog.has_table_privilege('authenticated',c.oid,'SELECT');
  IF check_count<>2 THEN
    RAISE EXCEPTION 'N10 staging private table privileges drift: refusing migration';
  END IF;

  EXECUTE $n10_create$
    CREATE FUNCTION public.mmh_n10_recovery_session_active(
      p_user_id uuid, p_session_id uuid, p_expected_aal text
    )
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = ''
    AS $n10_body$
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
               WHERE f.id=s.factor_id
                 AND f.user_id=p_user_id
                 AND f.status::text='verified'
             ))
          )
      )
    $n10_body$
  $n10_create$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.mmh_n10_recovery_session_active(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_session_active(uuid,uuid,text) TO service_role';

  SELECT p.oid INTO new_oid
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='mmh_n10_recovery_session_active'
    AND pg_catalog.pg_get_function_identity_arguments(p.oid)
       = 'p_user_id uuid, p_session_id uuid, p_expected_aal text';

  IF new_oid IS NULL
     OR (SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid=new_oid) IS DISTINCT FROM TRUE
     OR pg_catalog.has_function_privilege('anon',new_oid,'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated',new_oid,'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('service_role',new_oid,'EXECUTE')
     OR public.mmh_n10_recovery_session_active(
          '00000000-0000-0000-0000-000000000000'::uuid,
          '00000000-0000-0000-0000-000000000001'::uuid,'aal1') IS DISTINCT FROM FALSE
     OR public.mmh_n10_recovery_session_active(
          '00000000-0000-0000-0000-000000000000'::uuid,
          '00000000-0000-0000-0000-000000000001'::uuid,'aal2') IS DISTINCT FROM FALSE
  THEN
    RAISE EXCEPTION 'N10 staging new guard postcheck failed: atomic rollback';
  END IF;
END
$n10_stage_install$;
