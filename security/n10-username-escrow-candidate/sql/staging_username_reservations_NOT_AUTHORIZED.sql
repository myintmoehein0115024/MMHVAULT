-- N10 STAGING-ONLY SCHEMA CANDIDATE — NOT AUTHORIZED TO EXECUTE.
-- This file has NO approval SET command and MUST fail closed.
-- Project allowed only after separate authorization: ldivswlhtgmznzwhzsoi
-- Production MUST NOT be used. Original A/B fixtures and Vault untouched.
-- Read-only metadata (2026-11-03) showed 3 missing username RPCs,
-- signup reservation table, and no confirmed rate bucket table.
BEGIN;
DO $guard$
BEGIN
 IF current_setting('mmhvault.n10_staging_schema_approved',true)
    IS DISTINCT FROM 'ldivswlhtgmznzwhzsoi-username-reservations-v1'
 THEN RAISE EXCEPTION 'NOT APPROVED: N10 STAGING ONLY'; END IF;
 IF to_regclass('public.mmh_n10a769_signup_reservations') IS NOT NULL
    OR to_regclass('public.mmh_n10a769_rate_buckets') IS NOT NULL
    OR to_regprocedure('public.mmh_n10a769_reserve_username(text,uuid,text)') IS NOT NULL
    OR to_regprocedure('public.mmh_n10a769_claim_enrollment(text,uuid,text)') IS NOT NULL
    OR to_regprocedure('public.mmh_n10a769_take_attempt(text,integer,integer)') IS NOT NULL
 THEN RAISE EXCEPTION 'SCHEMA DRIFT: review before proceeding'; END IF;
 IF to_regclass('public.mmh_n10a740_username_links') IS NULL
    OR to_regclass('public.mmh_n10a769_recovery_phrases') IS NULL
    OR to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text)') IS NULL
    OR to_regprocedure('public.mmh_n10_recovery_backup_get(uuid)') IS NULL
    OR to_regprocedure('public.mmh_n10_recovery_backup_exists(uuid)') IS NULL
 THEN RAISE EXCEPTION 'N10 Vault prerequisites missing'; END IF;
END $guard$;

CREATE TABLE public.mmh_n10a769_signup_reservations(
 username_key text PRIMARY KEY CHECK(username_key ~ '^[a-z][a-z0-9_]{3,19}$'),
 reservation_id uuid NOT NULL UNIQUE,
 verifier text NOT NULL CHECK(verifier ~ '^[0-9a-f]{64}$'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','claimed')),
 expires_at timestamptz NOT NULL
);
ALTER TABLE public.mmh_n10a769_signup_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mmh_n10a769_signup_reservations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.mmh_n10a769_signup_reservations TO service_role;

CREATE TABLE public.mmh_n10a769_rate_buckets(
 bucket_key text PRIMARY KEY CHECK(bucket_key ~ '^[0-9a-f]{64}$'),
 hits integer NOT NULL CHECK(hits>=1),
 reset_at timestamptz NOT NULL
);
ALTER TABLE public.mmh_n10a769_rate_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mmh_n10a769_rate_buckets FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.mmh_n10a769_rate_buckets TO service_role;

CREATE FUNCTION public.mmh_n10a769_reserve_username(
 p_username text,p_reservation_id uuid,p_verifier text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE v_result uuid;
BEGIN
 IF p_username !~ '^[a-z][a-z0-9_]{3,19}$' OR p_reservation_id IS NULL
    OR p_verifier !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.mmh_n10a740_username_links
           WHERE username_key=p_username) THEN RETURN false; END IF;
 INSERT INTO public.mmh_n10a769_signup_reservations AS r
 (username_key,reservation_id,verifier,status,expires_at)
 VALUES(p_username,p_reservation_id,p_verifier,'pending',now()+interval '30 minutes')
 ON CONFLICT(username_key) DO UPDATE SET
 reservation_id=EXCLUDED.reservation_id,verifier=EXCLUDED.verifier,
 status='pending',expires_at=EXCLUDED.expires_at
 WHERE r.expires_at<=now()
 RETURNING reservation_id INTO v_result;
 RETURN coalesce(v_result=p_reservation_id,false);
END $f$;
REVOKE ALL ON FUNCTION public.mmh_n10a769_reserve_username(text,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10a769_reserve_username(text,uuid,text) TO service_role;

CREATE FUNCTION public.mmh_n10a769_claim_enrollment(
 p_username text,p_reservation_id uuid,p_verifier text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE v_result uuid;
BEGIN
 UPDATE public.mmh_n10a769_signup_reservations AS r SET status='claimed'
 WHERE r.username_key=p_username AND r.reservation_id=p_reservation_id
 AND r.verifier=p_verifier AND r.status='pending' AND r.expires_at>now()
 AND NOT EXISTS(SELECT 1 FROM public.mmh_n10a740_username_links AS l
                WHERE l.username_key=p_username)
 RETURNING r.reservation_id INTO v_result;
 RETURN coalesce(v_result=p_reservation_id,false);
END $f$;
REVOKE ALL ON FUNCTION public.mmh_n10a769_claim_enrollment(text,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10a769_claim_enrollment(text,uuid,text) TO service_role;

CREATE FUNCTION public.mmh_n10a769_take_attempt(
 p_key text,p_limit integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE v_hits integer;
BEGIN
 IF p_key !~ '^[0-9a-f]{64}$' OR p_limit NOT BETWEEN 1 AND 100
    OR p_window_seconds NOT BETWEEN 30 AND 86400 THEN RETURN false; END IF;
 INSERT INTO public.mmh_n10a769_rate_buckets AS r(bucket_key,hits,reset_at)
 VALUES(p_key,1,now()+make_interval(secs=>p_window_seconds))
 ON CONFLICT(bucket_key) DO UPDATE SET
 hits=CASE WHEN r.reset_at<=now() THEN 1 ELSE LEAST(r.hits,p_limit)+1 END,
 reset_at=CASE WHEN r.reset_at<=now()
               THEN now()+make_interval(secs=>p_window_seconds) ELSE r.reset_at END
 RETURNING hits INTO v_hits;
 RETURN v_hits<=p_limit;
END $f$;
REVOKE ALL ON FUNCTION public.mmh_n10a769_take_attempt(text,integer,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mmh_n10a769_take_attempt(text,integer,integer) TO service_role;
COMMIT;
