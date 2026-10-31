-- N10 Fixed Recovery Key — STAGING CANDIDATE, NOT PRODUCTION AUTHORIZED
-- Store each user's *existing* 10-word phrase encrypted in Supabase Vault.
-- Never infer original words from the one-way verifier and never replace a
-- saved phrase without a separate owner-approved migration.
BEGIN;
CREATE SCHEMA IF NOT EXISTS mmh_n10_privacy;
REVOKE ALL ON SCHEMA mmh_n10_privacy FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS mmh_n10_privacy.recovery_backup_index(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 secret_id uuid NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mmh_n10_privacy.recovery_backup_index ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mmh_n10_privacy.recovery_backup_index FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE IF NOT EXISTS mmh_n10_privacy.recovery_rate_bucket(
 bucket text PRIMARY KEY,
 attempts integer NOT NULL DEFAULT 0,
 reset_at timestamptz NOT NULL
);
ALTER TABLE mmh_n10_privacy.recovery_rate_bucket ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mmh_n10_privacy.recovery_rate_bucket FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION mmh_n10_privacy.cleanup_recovery_vault_secret()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 DELETE FROM vault.secrets WHERE id=OLD.secret_id;
 RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION mmh_n10_privacy.cleanup_recovery_vault_secret() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER mmh_n10_recovery_secret_gc AFTER DELETE ON mmh_n10_privacy.recovery_backup_index
FOR EACH ROW EXECUTE FUNCTION mmh_n10_privacy.cleanup_recovery_vault_secret();

CREATE OR REPLACE FUNCTION public.mmh_n10_recovery_backup_put(p_user_id uuid,p_phrase text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_secret_id uuid; v_existing text;
BEGIN
 IF p_user_id IS NULL OR p_phrase IS NULL OR length(p_phrase)>240
   OR p_phrase !~ '^([a-z]{2,13} ){9}[a-z]{2,13}$' THEN
   RAISE EXCEPTION 'Invalid recovery key' USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id) THEN
   RAISE EXCEPTION 'Unknown owner' USING ERRCODE='28000';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,190031));
 SELECT secret_id INTO v_secret_id
 FROM mmh_n10_privacy.recovery_backup_index WHERE user_id=p_user_id FOR UPDATE;
 IF v_secret_id IS NOT NULL THEN
   SELECT decrypted_secret INTO v_existing FROM vault.decrypted_secrets WHERE id=v_secret_id;
   IF v_existing IS DISTINCT FROM p_phrase THEN
     RAISE EXCEPTION 'Original key is immutable' USING ERRCODE='42501';
   END IF;
   RETURN true;
 END IF;
 v_secret_id := vault.create_secret(p_phrase,
   'mmh_n10_fixed_recovery_'||replace(p_user_id::text,'-',''),
   'MMHVAULT encrypted fixed recovery phrase; owner-only API');
 INSERT INTO mmh_n10_privacy.recovery_backup_index(user_id,secret_id)
 VALUES (p_user_id,v_secret_id);
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.mmh_n10_recovery_backup_put(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_backup_put(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.mmh_n10_recovery_backup_exists(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM mmh_n10_privacy.recovery_backup_index WHERE user_id=p_user_id);
$$;
REVOKE ALL ON FUNCTION public.mmh_n10_recovery_backup_exists(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_backup_exists(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mmh_n10_recovery_backup_get(p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT vault.decrypted_secrets.decrypted_secret
 FROM mmh_n10_privacy.recovery_backup_index AS idx
 JOIN vault.decrypted_secrets ON vault.decrypted_secrets.id=idx.secret_id
 WHERE idx.user_id=p_user_id;
$$;
REVOKE ALL ON FUNCTION public.mmh_n10_recovery_backup_get(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_backup_get(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mmh_n10_recovery_take_attempt(
 p_bucket text,p_limit integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;
BEGIN
 IF p_bucket !~ '^[a-f0-9]{64}$' OR p_limit NOT BETWEEN 1 AND 10
    OR p_window_seconds NOT BETWEEN 60 AND 86400 THEN
   RAISE EXCEPTION 'Invalid limit' USING ERRCODE='22023';
 END IF;
 INSERT INTO mmh_n10_privacy.recovery_rate_bucket AS bucket(bucket,attempts,reset_at)
 VALUES (p_bucket,1,now()+make_interval(secs=>p_window_seconds))
 ON CONFLICT (bucket) DO UPDATE SET
 attempts=CASE WHEN bucket.reset_at<=now() THEN 1 ELSE bucket.attempts+1 END,
 reset_at=CASE WHEN bucket.reset_at<=now() THEN now()+make_interval(secs=>p_window_seconds) ELSE bucket.reset_at END
 RETURNING attempts INTO n;
 RETURN n<=p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.mmh_n10_recovery_take_attempt(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_take_attempt(text,integer,integer) TO service_role;

COMMIT;
