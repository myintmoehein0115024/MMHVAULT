-- MMHVAULT N10 V2: Staging ONLY, isolated synthetic E/F database rehearsal.
-- Owner-approved 2026-11-04. NEVER apply to Production.
-- This is NOT the Production DDL and never updates existing N10 tables/functions.
-- All accounts below are synthetic QA records, NOT auth.users or real logins.
DO $preflight$
BEGIN
 IF to_regnamespace('mmh_n10_v2qa_20261104') IS NOT NULL
   OR to_regnamespace('mmh_n10_privacy') IS NULL
   OR to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text)') IS NULL
   OR to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text,text)') IS NOT NULL
   OR NOT EXISTS (SELECT 1 FROM public.mmh_n10a740_username_links WHERE username_key='n10qa_c_20261104')
   OR NOT EXISTS (SELECT 1 FROM public.mmh_n10a740_username_links WHERE username_key='n10qa_d_20261104')
 THEN RAISE EXCEPTION 'N10 V2 E/F rehearsal: isolated Staging prerequisites missing or schema already exists' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='supabase_vault')
    OR to_regclass('vault.decrypted_secrets') IS NULL
 THEN RAISE EXCEPTION 'Staging Supabase Vault prerequisites missing' USING ERRCODE='55000';
 END IF;
END $preflight$;

CREATE SCHEMA mmh_n10_v2qa_20261104;
REVOKE ALL ON SCHEMA mmh_n10_v2qa_20261104 FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE mmh_n10_v2qa_20261104.qa_window (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 enabled boolean NOT NULL,
 expires_at timestamptz NOT NULL
);
INSERT INTO mmh_n10_v2qa_20261104.qa_window(singleton,enabled,expires_at)
VALUES(true,true,'2026-11-04T16:00:00Z'::timestamptz);

CREATE TABLE mmh_n10_v2qa_20261104.owners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 username_key text UNIQUE NOT NULL
   CHECK (username_key IN ('n10v2qa_e_20261104','n10v2qa_f_20261104')),
 created_at timestamptz NOT NULL DEFAULT now(),
 email_confirmed boolean NOT NULL DEFAULT true,
 is_anonymous boolean NOT NULL DEFAULT false,
 is_banned boolean NOT NULL DEFAULT false,
 is_deleted boolean NOT NULL DEFAULT false
);
CREATE TABLE mmh_n10_v2qa_20261104.verifiers (
 user_id uuid PRIMARY KEY REFERENCES mmh_n10_v2qa_20261104.owners(id) ON DELETE RESTRICT,
 verifier text NOT NULL CHECK (verifier ~ '^[0-9a-f]{64}$'),
 version smallint NOT NULL DEFAULT 1 CHECK (version=1),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mmh_n10_v2qa_20261104.sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES mmh_n10_v2qa_20261104.owners(id) ON DELETE RESTRICT,
 aal text NOT NULL CHECK (aal IN ('aal1','aal2')),
 factor_id uuid,
 factor_verified boolean NOT NULL DEFAULT false,
 revoked boolean NOT NULL DEFAULT false,
 not_after timestamptz NOT NULL DEFAULT now()+interval '2 hours',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mmh_n10_v2qa_20261104.username_links (
 user_id uuid PRIMARY KEY REFERENCES mmh_n10_v2qa_20261104.owners(id) ON DELETE RESTRICT,
 username_key text UNIQUE NOT NULL
);
CREATE TABLE mmh_n10_v2qa_20261104.backup_index (
 user_id uuid PRIMARY KEY REFERENCES mmh_n10_v2qa_20261104.owners(id) ON DELETE RESTRICT,
 secret_id uuid NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mmh_n10_v2qa_20261104.rate_buckets (
 bucket text PRIMARY KEY CHECK (bucket ~ '^[0-9a-f]{64}$'),
 attempts integer NOT NULL CHECK(attempts>=0),
 reset_at timestamptz NOT NULL
);

INSERT INTO mmh_n10_v2qa_20261104.owners(username_key)
VALUES ('n10v2qa_e_20261104'),('n10v2qa_f_20261104');
INSERT INTO mmh_n10_v2qa_20261104.verifiers(user_id,verifier,version)
SELECT id, CASE username_key
 WHEN 'n10v2qa_e_20261104' THEN repeat('e',64)
 ELSE repeat('f',64) END,1
FROM mmh_n10_v2qa_20261104.owners;

ALTER TABLE mmh_n10_v2qa_20261104.qa_window ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_v2qa_20261104.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_v2qa_20261104.verifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_v2qa_20261104.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_v2qa_20261104.username_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_v2qa_20261104.backup_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_v2qa_20261104.rate_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA mmh_n10_v2qa_20261104 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA mmh_n10_v2qa_20261104 FROM PUBLIC,anon,authenticated,service_role;

-- Exact three-argument V2 put rehearsal. Row locks and checks mirror the
-- proposed Production logic but all owner data stays in this synthetic schema.
CREATE FUNCTION mmh_n10_v2qa_20261104.backup_put(p_user_id uuid,p_phrase text,p_verifier text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $put$
DECLARE v_secret_id uuid; v_existing text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM mmh_n10_v2qa_20261104.qa_window
               WHERE singleton AND enabled AND expires_at>now()) THEN
  RAISE EXCEPTION 'N10 isolated V2 QA is closed' USING ERRCODE='42501';
 END IF;
 IF p_user_id IS NULL OR p_phrase IS NULL OR length(p_phrase)>240
    OR p_phrase !~ '^([a-z]{2,13} ){9}[a-z]{2,13}$'
    OR p_verifier IS NULL OR p_verifier !~ '^[0-9a-f]{64}$'
 THEN RAISE EXCEPTION 'Invalid synthetic enrollment input' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,190031));
 PERFORM 1 FROM mmh_n10_v2qa_20261104.owners locked_owner
  WHERE locked_owner.id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown synthetic owner' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM mmh_n10_v2qa_20261104.owners u
  JOIN mmh_n10_v2qa_20261104.verifiers r ON r.user_id=u.id
  WHERE u.id=p_user_id AND u.email_confirmed
    AND NOT u.is_anonymous AND NOT u.is_banned AND NOT u.is_deleted
    AND u.created_at>=now()-interval '30 minutes'
    AND r.created_at>=now()-interval '30 minutes'
    AND r.version=1 AND r.verifier=p_verifier
    AND NOT EXISTS(SELECT 1 FROM mmh_n10_v2qa_20261104.sessions prior WHERE prior.user_id=p_user_id)
    AND NOT EXISTS(SELECT 1 FROM mmh_n10_v2qa_20261104.username_links link WHERE link.user_id=p_user_id)
 ) THEN RAISE EXCEPTION 'Synthetic owner / verifier / first-session gate rejected' USING ERRCODE='42501'; END IF;
 SELECT secret_id INTO v_secret_id
 FROM mmh_n10_v2qa_20261104.backup_index WHERE user_id=p_user_id FOR UPDATE;
 IF v_secret_id IS NOT NULL THEN
  SELECT decrypted_secret INTO v_existing FROM vault.decrypted_secrets WHERE id=v_secret_id;
  IF v_existing IS DISTINCT FROM p_phrase
  THEN RAISE EXCEPTION 'Fixed synthetic key immutable' USING ERRCODE='42501'; END IF;
  RETURN true;
 END IF;
 v_secret_id:=vault.create_secret(p_phrase,
    'mmh_n10_v2qa_20261104_'||replace(p_user_id::text,'-',''),
    'N10 Staging synthetic E/F immutable original-key QA',NULL::uuid);
 INSERT INTO mmh_n10_v2qa_20261104.backup_index(user_id,secret_id) VALUES(p_user_id,v_secret_id);
 RETURN true;
END
$put$;

-- Boolean-only recovery check: no plaintext returned to tools or web clients.
-- Identity and AAL2 are *simulated*; live JWT and TOTP are out of scope here.
CREATE FUNCTION mmh_n10_v2qa_20261104.recovery_matches(
 p_requester uuid,p_owner uuid,p_session uuid,p_expected_phrase text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $match$
 SELECT EXISTS (
  SELECT 1 FROM mmh_n10_v2qa_20261104.qa_window win
  JOIN mmh_n10_v2qa_20261104.owners owner ON true
  JOIN mmh_n10_v2qa_20261104.sessions s ON s.user_id=owner.id
  JOIN mmh_n10_v2qa_20261104.backup_index i ON i.user_id=owner.id
  JOIN vault.decrypted_secrets v ON v.id=i.secret_id
  WHERE win.singleton AND win.enabled AND win.expires_at>now()
    AND p_requester=p_owner AND owner.id=p_owner
    AND owner.email_confirmed AND NOT owner.is_anonymous
    AND NOT owner.is_banned AND NOT owner.is_deleted
    AND s.id=p_session AND s.aal='aal2'
    AND s.factor_id IS NOT NULL AND s.factor_verified AND NOT s.revoked
    AND s.not_after>now()
    AND v.decrypted_secret=p_expected_phrase
 );
$match$;

CREATE FUNCTION mmh_n10_v2qa_20261104.take_attempt(
 p_bucket text,p_limit integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $rate$
DECLARE v_attempts integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM mmh_n10_v2qa_20261104.qa_window WHERE singleton AND enabled AND expires_at>now()) THEN
  RAISE EXCEPTION 'N10 isolated V2 QA is closed' USING ERRCODE='42501';
 END IF;
 IF p_bucket !~ '^[0-9a-f]{64}$' OR p_limit NOT BETWEEN 1 AND 10
    OR p_window_seconds NOT BETWEEN 60 AND 86400
 THEN RAISE EXCEPTION 'Invalid synthetic rate inputs' USING ERRCODE='22023'; END IF;
 INSERT INTO mmh_n10_v2qa_20261104.rate_buckets AS rb(bucket,attempts,reset_at)
 VALUES (p_bucket,1,now()+pg_catalog.make_interval(secs=>p_window_seconds))
 ON CONFLICT(bucket) DO UPDATE SET
 attempts=CASE WHEN rb.reset_at<=now() THEN 1 ELSE LEAST(rb.attempts,p_limit)+1 END,
 reset_at=CASE WHEN rb.reset_at<=now() THEN now()+pg_catalog.make_interval(secs=>p_window_seconds) ELSE rb.reset_at END
 RETURNING attempts INTO v_attempts;
 RETURN v_attempts<=p_limit;
END
$rate$;

-- The schema is NOT configured as an exposed PostgREST API schema.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mmh_n10_v2qa_20261104 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA mmh_n10_v2qa_20261104 TO service_role;
GRANT EXECUTE ON FUNCTION mmh_n10_v2qa_20261104.backup_put(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION mmh_n10_v2qa_20261104.recovery_matches(uuid,uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION mmh_n10_v2qa_20261104.take_attempt(text,integer,integer) TO service_role;
COMMENT ON SCHEMA mmh_n10_v2qa_20261104 IS 'OWNER APPROVED synthetic E/F N10 V2 Staging database rehearsal only. Isolated and time-boxed; not Production. Synthetic owners are NOT auth.users.';
