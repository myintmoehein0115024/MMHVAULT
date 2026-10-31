-- MMHVAULT N10 — AUTH-STAGING SYNTHETIC VERIFIER FIXTURE, NOT PRODUCTION.
-- Purpose: enable independently created, owner-approved synthetic accounts
-- to exercise original-phrase verification in a SEPARATE staging project.
-- Exact Staging project: ldivswlhtgmznzwhzsoi.
-- PROHIBITED on production: vrypucmyrztxgiqhjspd.
-- REVIEW-ONLY: DO NOT EXECUTE UNTIL PREVIOUS MIGRATION SAFETY GATE IS RESOLVED.
-- No real accounts, keys, emails, recovery words or test rows are included.
--
-- This matches the read-only observed production table structure and constraints;
-- it is deliberately first-install-only so an unexpected same-name table aborts.
-- The table remains outside normal app access and has no RLS policies.
BEGIN;

CREATE TABLE public.mmh_n10a769_recovery_phrases (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  verifier text NOT NULL CONSTRAINT mmh_n10a769_recovery_phrases_verifier_check
    CHECK (verifier ~ '^[0-9a-f]{64}$'),
  version smallint NOT NULL DEFAULT 1
    CONSTRAINT mmh_n10a769_recovery_phrases_version_check CHECK (version=1),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mmh_n10a769_recovery_phrases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.mmh_n10a769_recovery_phrases
  FROM PUBLIC, anon, authenticated, service_role;
-- Backend-only testing of SYNTHETIC records; no direct browser access.
GRANT SELECT, INSERT, DELETE ON TABLE public.mmh_n10a769_recovery_phrases
  TO service_role;

COMMIT;

-- AFTER SEPARATE AUTHORIZATION: inspect table privileges and RLS.
-- Never generate phrase verifiers with production HMAC keys. Staging-only
-- test identities must be created via an independently approved test flow
-- with Staging-only credentials and ephemeral synthetic 10-word phrases.
-- STOP if an actual account or unrelated verifier record already exists.
-- Rollback (also permission-gated): delete only approved synthetic Auth
-- users through reviewed QA cleanup; ON DELETE CASCADE clears verifier
-- rows. Confirm zero fixture rows, then drop this exact fixture table.
-- Never CASCADE-drop public, vault, or unrelated application tables.
