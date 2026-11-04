-- N10 PRODUCTION PRIVATE RECOVERY VAULT — NOT AUTHORIZED / DO NOT RUN.
-- Review-only draft: no schema or Production permission is granted.
-- Must set both explicit session-scoped approval settings OUTSIDE this SQL.
BEGIN;
DO $guard$
BEGIN
 IF current_setting('mmhvault.n10_private_vault_schema_approved',true)
      IS DISTINCT FROM 'n10-prod-private-vault-v1-approved'
    OR current_setting('mmhvault.n10_private_vault_project_ref',true)
      IS DISTINCT FROM 'vrypucmyrztxgiqhjspd'
 THEN RAISE EXCEPTION 'N10 production migration NOT AUTHORIZED' USING ERRCODE='42501'; END IF;
 IF to_regnamespace('mmh_n10_privacy') IS NOT NULL
    OR to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text)') IS NOT NULL
    OR to_regprocedure('public.mmh_n10_recovery_backup_get(uuid)') IS NOT NULL
    OR to_regprocedure('public.mmh_n10_recovery_backup_exists(uuid)') IS NOT NULL
    OR to_regprocedure('public.mmh_n10_recovery_session_active(uuid,uuid,text)') IS NOT NULL
    OR to_regprocedure('public.mmh_n10_recovery_take_attempt(text,integer,integer)') IS NOT NULL
 THEN RAISE EXCEPTION 'N10 Vault objects already exist: manual reconciliation required' USING ERRCODE='42710'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='supabase_vault')
    OR to_regclass('public.mmh_n10a769_recovery_phrases') IS NULL
    OR to_regclass('public.mmh_n10a740_username_links') IS NULL
    OR to_regclass('auth.sessions') IS NULL OR to_regclass('auth.mfa_factors') IS NULL
 THEN RAISE EXCEPTION 'N10 Vault prerequisites absent' USING ERRCODE='55000'; END IF;
END
$guard$;

CREATE SCHEMA mmh_n10_privacy;
REVOKE ALL ON SCHEMA mmh_n10_privacy FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE mmh_n10_privacy.recovery_backup_index(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
 secret_id uuid NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mmh_n10_privacy.recovery_rate_bucket(
 bucket text PRIMARY KEY CHECK(bucket ~ '^[0-9a-f]{64}$'),
 attempts integer NOT NULL CHECK(attempts>=0),
 reset_at timestamptz NOT NULL
);
ALTER TABLE mmh_n10_privacy.recovery_backup_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_privacy.recovery_rate_bucket ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA mmh_n10_privacy FROM PUBLIC,anon,authenticated,service_role;
-- No client RLS policies; only tightly restricted SECURITY DEFINER RPCs.

CREATE FUNCTION public.mmh_n10_recovery_backup_put(p_user_id uuid,p_phrase text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $put$
DECLARE v_secret_id uuid;v_existing text;
BEGIN
 IF p_user_id IS NULL OR p_phrase IS NULL OR length(p_phrase)>240 OR
    p_phrase !~ '^([a-z]{2,13} ){9}[a-z]{2,13}$'
 THEN RAISE EXCEPTION 'Invalid original words' USING ERRCODE='22023'; END IF;
 -- Only brand-new username-only owner, newly recorded verifier, first session
 -- not yet granted. Never silently backfill historical verifier-only accounts.
 IF NOT EXISTS(
  SELECT 1 FROM auth.users u
  JOIN public.mmh_n10a769_recovery_phrases r ON r.user_id=u.id
  WHERE u.id=p_user_id
    AND r.version=1 AND r.verifier ~ '^[a-f0-9]{64}$'
    -- A historical login or already bound username forbids initial backup.
    AND NOT EXISTS(SELECT 1 FROM auth.sessions AS prior WHERE prior.user_id=p_user_id)
    AND NOT EXISTS(SELECT 1 FROM public.mmh_n10a740_username_links AS link
                   WHERE link.user_id=p_user_id)
    AND u.created_at>=now()-interval '30 minutes'
    AND r.created_at>=now()-interval '30 minutes'
    AND u.email_confirmed_at IS NOT NULL
    AND right(u.email,length('@no-mail.mmhvault.invalid'))='@no-mail.mmhvault.invalid'
    AND u.raw_app_meta_data->>'mmhvault_auth_kind'='username_only'
 )
 THEN RAISE EXCEPTION 'Fresh username verifier required' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,190031));
 SELECT secret_id INTO v_secret_id FROM mmh_n10_privacy.recovery_backup_index
 WHERE user_id=p_user_id FOR UPDATE;
 IF v_secret_id IS NOT NULL THEN
  SELECT decrypted_secret INTO v_existing FROM vault.decrypted_secrets WHERE id=v_secret_id;
  IF v_existing IS DISTINCT FROM p_phrase
  THEN RAISE EXCEPTION 'Fixed key immutable' USING ERRCODE='42501'; END IF;
  RETURN true;
 END IF;
 v_secret_id:=vault.create_secret(p_phrase,
  'mmh_n10_fixed_recovery_'||replace(p_user_id::text,'-',''),
  'Permanent original recovery words',NULL::uuid);
 INSERT INTO mmh_n10_privacy.recovery_backup_index(user_id,secret_id) VALUES(p_user_id,v_secret_id);
 RETURN true;
END
$put$;

CREATE FUNCTION public.mmh_n10_recovery_backup_exists(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $exists$
 SELECT EXISTS(SELECT 1 FROM mmh_n10_privacy.recovery_backup_index WHERE user_id=p_user_id);
$exists$;

CREATE FUNCTION public.mmh_n10_recovery_backup_get(p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $get$
 SELECT v.decrypted_secret FROM mmh_n10_privacy.recovery_backup_index i
 JOIN vault.decrypted_secrets v ON v.id=i.secret_id WHERE i.user_id=p_user_id;
$get$;

-- Edge must supply an Auth-verified JWT owner and matching JWT session_id.
CREATE FUNCTION public.mmh_n10_recovery_session_active(
 p_user_id uuid,p_session_id uuid,p_expected_aal text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $session$
 SELECT p_expected_aal IN('aal1','aal2') AND EXISTS(
  SELECT 1 FROM auth.sessions s
  JOIN auth.users active_owner ON active_owner.id=s.user_id
  WHERE s.id=p_session_id AND s.user_id=p_user_id
   AND (s.not_after IS NULL OR s.not_after>now())
   AND active_owner.deleted_at IS NULL
   AND active_owner.is_anonymous IS FALSE
   AND (active_owner.banned_until IS NULL OR active_owner.banned_until<=now())
   AND (
    (p_expected_aal='aal1' AND s.aal::text='aal1' AND s.factor_id IS NULL
     AND NOT EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=p_user_id AND f.status::text='verified'))
    OR
    (p_expected_aal='aal2' AND s.aal::text='aal2' AND s.factor_id IS NOT NULL
     AND EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.id=s.factor_id
       AND f.user_id=p_user_id AND f.status::text='verified'))
   )
 );
$session$;

CREATE FUNCTION public.mmh_n10_recovery_take_attempt(
 p_bucket text,p_limit integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $rate$
DECLARE v_attempts integer;
BEGIN
 IF p_bucket !~ '^[a-f0-9]{64}$' OR p_limit NOT BETWEEN 1 AND 10
 OR p_window_seconds NOT BETWEEN 60 AND 86400
 THEN RAISE EXCEPTION 'Invalid rate inputs' USING ERRCODE='22023'; END IF;
 INSERT INTO mmh_n10_privacy.recovery_rate_bucket AS rb(bucket,attempts,reset_at)
 VALUES(p_bucket,1,now()+pg_catalog.make_interval(secs=>p_window_seconds))
 ON CONFLICT(bucket) DO UPDATE SET
 attempts=CASE WHEN rb.reset_at<=now() THEN 1 ELSE LEAST(rb.attempts,p_limit)+1 END,
 reset_at=CASE WHEN rb.reset_at<=now() THEN now()+pg_catalog.make_interval(secs=>p_window_seconds) ELSE rb.reset_at END
 RETURNING attempts INTO v_attempts;
 RETURN v_attempts<=p_limit;
END
$rate$;

-- Atomic revocation of the default PUBLIC function EXECUTE grants.
REVOKE ALL ON FUNCTION public.mmh_n10_recovery_backup_put(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mmh_n10_recovery_backup_exists(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mmh_n10_recovery_backup_get(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mmh_n10_recovery_session_active(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mmh_n10_recovery_take_attempt(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_backup_put(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_backup_exists(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_backup_get(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_session_active(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_take_attempt(text,integer,integer) TO service_role;
COMMIT;
-- REVIEW ONLY. Do not run without separate Production schema approval.
