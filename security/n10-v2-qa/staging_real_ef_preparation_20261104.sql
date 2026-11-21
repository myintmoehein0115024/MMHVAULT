-- MMHVAULT N10 REAL E/F STAGING PREPARATION (2026-11-04)
-- Explicitly authorized: prepare isolated, hard-OFF Staging Auth-test infrastructure.
-- Never execute against Production. NO auth.users creation or mutation in this migration.
-- No Edge deployment, public RPC, real phrase, Vault secret, session or user grant.
DO $preflight$
BEGIN
  IF to_regnamespace('mmh_n10_realef_20261104') IS NOT NULL
     OR to_regnamespace('mmh_n10_v2qa_20261104') IS NULL
     OR to_regnamespace('mmh_n10_privacy') IS NULL
     OR to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text)') IS NULL
     OR to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text,text)') IS NOT NULL
     OR NOT EXISTS (SELECT 1 FROM mmh_n10_v2qa_20261104.qa_window WHERE singleton AND enabled IS FALSE)
     OR (SELECT count(*) FROM mmh_n10_v2qa_20261104.backup_index) <> 2
     OR (SELECT count(*) FROM public.mmh_n10a740_username_links l
         JOIN mmh_n10_privacy.recovery_backup_index b ON b.user_id=l.user_id
         WHERE l.username_key LIKE 'n10qa_%') <> 4
     OR EXISTS (SELECT 1 FROM public.mmh_n10a740_username_links
         WHERE username_key IN ('n10real_e_20261104','n10real_f_20261104'))
     OR EXISTS (SELECT 1 FROM auth.users
         WHERE raw_app_meta_data->>'mmhvault_username'
           IN ('n10real_e_20261104','n10real_f_20261104'))
  THEN
    RAISE EXCEPTION 'N10 real E/F Staging preflight failed; no changes authorized'
      USING ERRCODE='42501';
  END IF;
END
$preflight$;

CREATE SCHEMA mmh_n10_realef_20261104;
REVOKE ALL ON SCHEMA mmh_n10_realef_20261104 FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE mmh_n10_realef_20261104.qa_gate (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  enabled boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT '1970-01-01T00:00:00Z'::timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO mmh_n10_realef_20261104.qa_gate(singleton,enabled,expires_at)
VALUES(true,false,'1970-01-01T00:00:00Z'::timestamptz);

-- Only two fixed Staging QA slots, no Auth identities or credentials yet.
CREATE TABLE mmh_n10_realef_20261104.expected_identity (
  slot text PRIMARY KEY CHECK(slot IN ('E','F')),
  username_key text NOT NULL UNIQUE,
  CONSTRAINT exact_real_ef_names CHECK(
   (slot='E' AND username_key='n10real_e_20261104') OR
   (slot='F' AND username_key='n10real_f_20261104'))
);
INSERT INTO mmh_n10_realef_20261104.expected_identity(slot,username_key)
VALUES ('E','n10real_e_20261104'),('F','n10real_f_20261104');

CREATE TABLE mmh_n10_realef_20261104.auth_bindings (
  slot text PRIMARY KEY REFERENCES mmh_n10_realef_20261104.expected_identity(slot) ON DELETE RESTRICT,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  bound_at timestamptz NOT NULL DEFAULT now()
);

-- Index contains secret identifiers ONLY; no plaintext words and no secret writes.
CREATE TABLE mmh_n10_realef_20261104.backup_index (
  user_id uuid PRIMARY KEY REFERENCES mmh_n10_realef_20261104.auth_bindings(user_id) ON DELETE RESTRICT,
  secret_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A future, separately authorized Auth API-created account may bind only when
-- fresh, unlinked, username-only, with matching server-owned QA metadata.
CREATE FUNCTION mmh_n10_realef_20261104.check_auth_binding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $bind$
DECLARE expected_name text;
BEGIN
  SELECT e.username_key INTO expected_name
    FROM mmh_n10_realef_20261104.expected_identity e WHERE e.slot=NEW.slot;
  IF expected_name IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id=NEW.user_id AND u.email_confirmed_at IS NOT NULL
      AND u.is_anonymous IS FALSE AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until<=now())
      AND u.created_at >= (SELECT g.created_at FROM mmh_n10_realef_20261104.qa_gate g WHERE g.singleton)
      AND u.raw_app_meta_data->>'mmhvault_auth_kind'='username_only'
      AND u.raw_app_meta_data->>'mmhvault_username'=expected_name
      AND u.raw_app_meta_data->>'mmhvault_qa_scope'='n10_real_ef_20261104'
      AND right(lower(u.email),length('@no-mail.n10-staging.mmhvault.invalid'))='@no-mail.n10-staging.mmhvault.invalid'
      AND NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.user_id=u.id)
      AND NOT EXISTS(SELECT 1 FROM public.mmh_n10a740_username_links l WHERE l.user_id=u.id)
  ) THEN
    RAISE EXCEPTION 'E/F real Auth binding denied: owner not fresh or isolated'
      USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$bind$;

CREATE TRIGGER guard_new_auth_binding
BEFORE INSERT ON mmh_n10_realef_20261104.auth_bindings
FOR EACH ROW EXECUTE FUNCTION mmh_n10_realef_20261104.check_auth_binding();

-- Permanently prevent ordinary DML edits to fixed owner/secret mapping.
CREATE FUNCTION mmh_n10_realef_20261104.deny_immutable_change()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $immutable$
BEGIN
  RAISE EXCEPTION 'N10 fixed E/F owner or recovery backup is immutable'
    USING ERRCODE='42501';
END;
$immutable$;
CREATE TRIGGER immutable_allowlist BEFORE UPDATE OR DELETE ON mmh_n10_realef_20261104.expected_identity
FOR EACH ROW EXECUTE FUNCTION mmh_n10_realef_20261104.deny_immutable_change();
CREATE TRIGGER immutable_auth_bindings BEFORE UPDATE OR DELETE ON mmh_n10_realef_20261104.auth_bindings
FOR EACH ROW EXECUTE FUNCTION mmh_n10_realef_20261104.deny_immutable_change();
CREATE TRIGGER immutable_backup_index BEFORE UPDATE OR DELETE ON mmh_n10_realef_20261104.backup_index
FOR EACH ROW EXECUTE FUNCTION mmh_n10_realef_20261104.deny_immutable_change();

ALTER TABLE mmh_n10_realef_20261104.qa_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_realef_20261104.expected_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_realef_20261104.auth_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_realef_20261104.backup_index ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA mmh_n10_realef_20261104 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA mmh_n10_realef_20261104 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mmh_n10_realef_20261104 FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON SCHEMA mmh_n10_realef_20261104 IS
 'Staging-only real Auth E/F preparation. Hard OFF, no Auth users, no Vault data, no client grants or exposed RPCs.';

-- No GRANT is issued intentionally. A later approved backend must add only
-- narrowly scoped service-only RPCs and a separate real Auth test window.
