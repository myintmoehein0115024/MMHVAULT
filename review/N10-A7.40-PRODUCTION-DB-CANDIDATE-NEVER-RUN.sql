-- N10-A7.40 PRODUCTION SCHEMA CANDIDATE / NEVER RUN WITHOUT SEPARATE APPROVAL
-- Scope: username aliases of EXISTING, email-confirmed Supabase users.
-- Not: username-only registration, automated account merge, device-approval installation.
-- Must review with Supabase security advisors and rollback plan before execution.
BEGIN;

CREATE TABLE public.mmh_n10a740_username_links (
 username_key text PRIMARY KEY,
 user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT mmh_a740_username_format CHECK (
   username_key ~ '^[a-z][a-z0-9_]{3,19}$' AND
   username_key NOT IN ('admin','administrator','root','system','support','mmhvault','security','billing','help')
 )
);
ALTER TABLE public.mmh_n10a740_username_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.mmh_n10a740_username_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.mmh_n10a740_username_links TO service_role;

-- The only persisted throttle value is a keyed HMAC; never raw IP,
-- username, Turnstile token, password, account id, or session token.
CREATE TABLE public.mmh_n10a740_attempt_buckets (
 bucket_key text PRIMARY KEY CHECK (bucket_key ~ '^[0-9a-f]{64}$'),
 attempt_count integer NOT NULL CHECK (attempt_count >= 0),
 window_end timestamptz NOT NULL
);
ALTER TABLE public.mmh_n10a740_attempt_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.mmh_n10a740_attempt_buckets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.mmh_n10a740_attempt_buckets TO service_role;

-- SECURITY INVOKER is sufficient: only server role has RPC EXECUTE and
-- table INSERT/UPDATE privileges; no anonymous elevation via definer.
CREATE OR REPLACE FUNCTION public.mmh_n10a740_take_attempt(
 p_key text, p_limit integer, p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $fn$
DECLARE v_count integer;
BEGIN
 IF p_key IS NULL OR p_key !~ '^[0-9a-f]{64}$'
    OR p_limit NOT BETWEEN 1 AND 100 OR p_window_seconds NOT BETWEEN 1 AND 3600
 THEN RAISE EXCEPTION 'invalid input'; END IF;
 INSERT INTO public.mmh_n10a740_attempt_buckets AS b
 (bucket_key,attempt_count,window_end)
 VALUES (p_key,1,now()+make_interval(secs=>p_window_seconds))
 ON CONFLICT (bucket_key) DO UPDATE SET
   attempt_count=CASE WHEN b.window_end<=now() THEN 1 ELSE b.attempt_count+1 END,
   window_end=CASE WHEN b.window_end<=now()
     THEN now()+make_interval(secs=>p_window_seconds) ELSE b.window_end END
 RETURNING attempt_count INTO v_count;
 RETURN v_count <= p_limit;
END;
$fn$;
REVOKE ALL ON FUNCTION public.mmh_n10a740_take_attempt(text,integer,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mmh_n10a740_take_attempt(text,integer,integer) TO service_role;
COMMIT;
-- Actual deployment requires a versioned migration, a fresh security audit,
-- rollout/rollback validation, and separate user authorization.
