-- N10 REAL E/F STAGING — BACKEND REVIEW ONLY (2026-11-04).
-- NOT EXECUTED. DO NOT RUN WITHOUT SEPARATE, SCOPED STAGING BACKEND APPROVAL.
-- This is NOT a Production migration and does not enable any QA entry point.
-- Prerequisite: approved HARD-OFF mmh_n10_realef_20261104 preparation schema.
BEGIN;
DO $preflight$
BEGIN
 IF to_regnamespace('mmh_n10_realef_20261104') IS NULL
    OR to_regnamespace('mmh_n10_privacy') IS NULL
    OR to_regnamespace('mmh_n10_v2qa_20261104') IS NULL
    OR to_regprocedure('public.mmh_n10_realef_backup_put(uuid,text,text,text)') IS NOT NULL
    OR to_regprocedure('public.mmh_n10_realef_claim(text,text)') IS NOT NULL
    OR to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text,text)') IS NOT NULL
    OR NOT EXISTS (SELECT 1 FROM mmh_n10_realef_20261104.qa_gate
        WHERE singleton AND enabled IS FALSE AND expires_at<'2000-01-01'::timestamptz)
    OR NOT EXISTS (SELECT 1 FROM mmh_n10_v2qa_20261104.qa_window
        WHERE singleton AND enabled IS FALSE)
    OR (SELECT count(*) FROM mmh_n10_realef_20261104.expected_identity)<>2
    OR (SELECT count(*) FROM mmh_n10_realef_20261104.auth_bindings)<>0
    OR (SELECT count(*) FROM mmh_n10_realef_20261104.backup_index)<>0
    OR (SELECT count(*) FROM mmh_n10_v2qa_20261104.backup_index)<>2
    OR (SELECT count(*) FROM public.mmh_n10a740_username_links l
        JOIN mmh_n10_privacy.recovery_backup_index i ON i.user_id=l.user_id
        WHERE l.username_key LIKE 'n10qa_%')<>4
    OR to_regclass('vault.decrypted_secrets') IS NULL
 THEN RAISE EXCEPTION 'N10 real EF backend preflight denied: not isolated Staging or drift'
   USING ERRCODE='42501';
 END IF;
END $preflight$;

CREATE TABLE mmh_n10_realef_20261104.slot_claims(
  slot text PRIMARY KEY REFERENCES mmh_n10_realef_20261104.expected_identity(slot) ON DELETE RESTRICT,
  claim_hash text NOT NULL CHECK(claim_hash ~ '^[a-f0-9]{64}$'),
  claimed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mmh_n10_realef_20261104.verifiers(
  user_id uuid PRIMARY KEY REFERENCES mmh_n10_realef_20261104.auth_bindings(user_id) ON DELETE RESTRICT,
  verifier text NOT NULL CHECK(verifier ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mmh_n10_realef_20261104.rate_buckets(
  bucket text PRIMARY KEY CHECK(bucket ~ '^[a-f0-9]{64}$'),
  attempts integer NOT NULL CHECK(attempts>=0),
  reset_at timestamptz NOT NULL
);
ALTER TABLE mmh_n10_realef_20261104.slot_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_realef_20261104.verifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_realef_20261104.rate_buckets ENABLE ROW LEVEL SECURITY;

-- An isolated claim is consumed once per slot; errors require manual reconciliation.
-- This intentionally cannot be automatically reset to create new Auth accounts.
CREATE FUNCTION public.mmh_n10_realef_claim(p_slot text,p_claim_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $claim$
BEGIN
 IF p_slot NOT IN ('E','F') OR p_claim_hash IS NULL
    OR p_claim_hash !~ '^[a-f0-9]{64}$'
    OR NOT EXISTS (SELECT 1 FROM mmh_n10_realef_20261104.qa_gate
      WHERE singleton AND enabled AND expires_at>now())
 THEN RETURN false; END IF;
 INSERT INTO mmh_n10_realef_20261104.slot_claims(slot,claim_hash)
 SELECT e.slot,p_claim_hash FROM mmh_n10_realef_20261104.expected_identity e
 WHERE e.slot=p_slot
 ON CONFLICT DO NOTHING;
 RETURN FOUND;
END $claim$;

-- Original words are backed up before Auth issues its FIRST login session.
-- The Edge must use authenticated Admin API and compute a keyed HMAC verifier.
-- SQL cannot prove the HMAC matches words without the private Edge secret.
CREATE FUNCTION public.mmh_n10_realef_backup_put(
 p_user_id uuid,p_slot text,p_phrase text,p_verifier text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $put$
DECLARE existing_secret uuid; original_words text;
BEGIN
 IF p_user_id IS NULL OR p_slot NOT IN ('E','F')
    OR p_phrase IS NULL OR length(p_phrase)>240
    OR p_phrase !~ '^([a-z]{2,13} ){9}[a-z]{2,13}$'
    OR p_verifier IS NULL OR p_verifier !~ '^[a-f0-9]{64}$'
    OR NOT EXISTS (SELECT 1 FROM mmh_n10_realef_20261104.qa_gate
      WHERE singleton AND enabled AND expires_at>now())
 THEN RAISE EXCEPTION 'E/F escrow input or gate denied' USING ERRCODE='42501'; END IF;

 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,190042));
 PERFORM 1 FROM auth.users u WHERE u.id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown E/F Auth owner' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM auth.users u
   JOIN mmh_n10_realef_20261104.expected_identity e ON e.slot=p_slot
   JOIN mmh_n10_realef_20261104.slot_claims claim ON claim.slot=e.slot
   JOIN mmh_n10_realef_20261104.qa_gate g ON g.singleton
   WHERE u.id=p_user_id
     AND u.created_at>=g.created_at AND u.created_at>=now()-interval '30 minutes'
     AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL
     AND u.is_anonymous IS FALSE
     AND (u.banned_until IS NULL OR u.banned_until<=now())
     AND u.raw_app_meta_data->>'mmhvault_auth_kind'='username_only'
     AND u.raw_app_meta_data->>'mmhvault_qa_scope'='n10_real_ef_20261104'
     AND u.raw_app_meta_data->>'mmhvault_username'=e.username_key
     AND right(lower(u.email),length('@no-mail.n10-staging.mmhvault.invalid'))
       ='@no-mail.n10-staging.mmhvault.invalid'
     AND NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.user_id=u.id)
     AND NOT EXISTS(SELECT 1 FROM public.mmh_n10a740_username_links l WHERE l.user_id=u.id)
 ) THEN RAISE EXCEPTION 'E/F owner is not fresh, isolated or session-free'
   USING ERRCODE='42501'; END IF;
 IF EXISTS (SELECT 1 FROM mmh_n10_realef_20261104.auth_bindings b
   WHERE b.slot=p_slot AND b.user_id<>p_user_id)
 THEN RAISE EXCEPTION 'E/F slot belongs to another owner' USING ERRCODE='42501'; END IF;

 INSERT INTO mmh_n10_realef_20261104.auth_bindings(slot,user_id)
 VALUES(p_slot,p_user_id) ON CONFLICT DO NOTHING;
 INSERT INTO mmh_n10_realef_20261104.verifiers(user_id,verifier)
 VALUES(p_user_id,p_verifier) ON CONFLICT DO NOTHING;
 IF NOT EXISTS (SELECT 1 FROM mmh_n10_realef_20261104.verifiers v
  WHERE v.user_id=p_user_id AND v.verifier=p_verifier)
 THEN RAISE EXCEPTION 'E/F verifier cannot be replaced' USING ERRCODE='42501'; END IF;

 SELECT i.secret_id INTO existing_secret
 FROM mmh_n10_realef_20261104.backup_index i
 WHERE i.user_id=p_user_id FOR UPDATE;
 IF existing_secret IS NOT NULL THEN
   SELECT decrypted_secret INTO original_words FROM vault.decrypted_secrets WHERE id=existing_secret;
   IF original_words IS DISTINCT FROM p_phrase
   THEN RAISE EXCEPTION 'E/F fixed Recovery Key immutable' USING ERRCODE='42501'; END IF;
   RETURN true;
 END IF;

 existing_secret:=vault.create_secret(
  p_phrase,'mmh_n10_realef_20261104_'||replace(p_user_id::text,'-',''),
  'N10 Staging REAL E/F immutable original words',NULL::uuid);
 INSERT INTO mmh_n10_realef_20261104.backup_index(user_id,secret_id)
 VALUES (p_user_id,existing_secret);
 -- Strict same-transaction readback must succeed before Auth login session.
 SELECT decrypted_secret INTO original_words
 FROM vault.decrypted_secrets WHERE id=existing_secret;
 IF original_words IS DISTINCT FROM p_phrase
 THEN RAISE EXCEPTION 'E/F Vault verification failed' USING ERRCODE='42501'; END IF;
 RETURN true;
END $put$;

CREATE FUNCTION public.mmh_n10_realef_owner_slot(p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $slot$
 SELECT b.slot FROM mmh_n10_realef_20261104.auth_bindings b
 JOIN auth.users u ON u.id=b.user_id
 JOIN mmh_n10_realef_20261104.qa_gate g ON g.singleton
 JOIN mmh_n10_realef_20261104.expected_identity e ON e.slot=b.slot
 WHERE b.user_id=p_user_id AND g.enabled AND g.expires_at>now()
   AND u.deleted_at IS NULL AND u.is_anonymous IS FALSE
   AND (u.banned_until IS NULL OR u.banned_until<=now())
   AND u.raw_app_meta_data->>'mmhvault_qa_scope'='n10_real_ef_20261104'
   AND u.raw_app_meta_data->>'mmhvault_username'=e.username_key;
$slot$;

CREATE FUNCTION public.mmh_n10_realef_session_active(
  p_user_id uuid,p_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $active$
 SELECT EXISTS (
  SELECT 1 FROM mmh_n10_realef_20261104.qa_gate g
  JOIN mmh_n10_realef_20261104.auth_bindings b ON true
  JOIN auth.users u ON u.id=b.user_id
  JOIN auth.sessions s ON s.user_id=b.user_id
  WHERE g.singleton AND g.enabled AND g.expires_at>now()
   AND b.user_id=p_user_id AND s.id=p_session_id
   AND s.aal::text='aal2' AND s.factor_id IS NOT NULL
   AND (s.not_after IS NULL OR s.not_after>now())
   AND u.deleted_at IS NULL AND u.is_anonymous IS FALSE
   AND (u.banned_until IS NULL OR u.banned_until<=now())
   AND u.raw_app_meta_data->>'mmhvault_qa_scope'='n10_real_ef_20261104'
   AND EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.id=s.factor_id
     AND f.user_id=p_user_id AND f.factor_type::text='totp'
     AND f.status::text='verified')
 );
$active$;

-- Backend-only plaintext viewer: Edge must already have authenticated the
-- exact caller JWT, verified session_id and freshly rechecked the password.
CREATE FUNCTION public.mmh_n10_realef_backup_get(
  p_user_id uuid,p_session_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $get$
 SELECT secret.decrypted_secret
 FROM mmh_n10_realef_20261104.backup_index i
 JOIN vault.decrypted_secrets secret ON secret.id=i.secret_id
 WHERE i.user_id=p_user_id
   AND public.mmh_n10_realef_session_active(p_user_id,p_session_id);
$get$;

CREATE FUNCTION public.mmh_n10_realef_backup_exists(
  p_user_id uuid,p_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $exists$
 SELECT public.mmh_n10_realef_session_active(p_user_id,p_session_id)
 AND EXISTS (SELECT 1 FROM mmh_n10_realef_20261104.backup_index i
  WHERE i.user_id=p_user_id);
$exists$;

CREATE FUNCTION public.mmh_n10_realef_take_attempt(
 p_bucket text,p_limit integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $rate$
DECLARE attempts_now integer;
BEGIN
 IF p_bucket IS NULL OR p_bucket !~ '^[a-f0-9]{64}$'
    OR p_limit NOT BETWEEN 1 AND 5 OR p_window_seconds NOT BETWEEN 60 AND 86400
    OR NOT EXISTS (SELECT 1 FROM mmh_n10_realef_20261104.qa_gate
      WHERE singleton AND enabled AND expires_at>now())
 THEN RETURN false; END IF;
 INSERT INTO mmh_n10_realef_20261104.rate_buckets AS r(bucket,attempts,reset_at)
 VALUES(p_bucket,1,now()+pg_catalog.make_interval(secs=>p_window_seconds))
 ON CONFLICT(bucket) DO UPDATE SET
 attempts=CASE WHEN r.reset_at<=now() THEN 1 ELSE LEAST(r.attempts,p_limit)+1 END,
 reset_at=CASE WHEN r.reset_at<=now() THEN
  now()+pg_catalog.make_interval(secs=>p_window_seconds) ELSE r.reset_at END
 RETURNING attempts INTO attempts_now;
 RETURN attempts_now<=p_limit;
END $rate$;

-- Immutable original HMAC and once-only E/F claim cannot be rotated.
CREATE TRIGGER immutable_realef_verifiers BEFORE UPDATE OR DELETE
 ON mmh_n10_realef_20261104.verifiers FOR EACH ROW
 EXECUTE FUNCTION mmh_n10_realef_20261104.deny_immutable_change();
CREATE TRIGGER immutable_realef_claims BEFORE UPDATE OR DELETE
 ON mmh_n10_realef_20261104.slot_claims FOR EACH ROW
 EXECUTE FUNCTION mmh_n10_realef_20261104.deny_immutable_change();

REVOKE ALL ON ALL TABLES IN SCHEMA mmh_n10_realef_20261104
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mmh_n10_realef_20261104
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.mmh_n10_realef_claim(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mmh_n10_realef_backup_put(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mmh_n10_realef_owner_slot(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mmh_n10_realef_session_active(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mmh_n10_realef_backup_get(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mmh_n10_realef_backup_exists(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mmh_n10_realef_take_attempt(text,integer,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mmh_n10_realef_claim(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_realef_backup_put(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_realef_owner_slot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_realef_session_active(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_realef_backup_get(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_realef_backup_exists(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10_realef_take_attempt(text,integer,integer)
 TO service_role;
COMMIT;
-- REVIEW ONLY — migration not applied, release flag remains OFF.
