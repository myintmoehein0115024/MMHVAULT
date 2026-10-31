-- N10 Storage guard rollback CANDIDATE — REVIEW ONLY, NEVER PRODUCTION AUTOMATIC.
-- This removes ONLY the newly added N10 restrictive policy, preserving every
-- existing Storage bucket, permissive owner policy, data, and object.
-- Roll back in a coordinated release window with financial API and public policies.
BEGIN;
DO $n10$
DECLARE
  policy_oid oid;
  actual_marker text;
BEGIN
  SELECT p.oid, obj_description(p.oid,'pg_policy')
  INTO policy_oid, actual_marker
  FROM pg_policy p
  JOIN pg_class c ON c.oid=p.polrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='storage' AND c.relname='objects'
    AND p.polname='mmh_n10_private_storage_mfa_guard';

  IF policy_oid IS NULL THEN
    RAISE NOTICE 'N10 Storage MFA policy absent; nothing to remove';
  ELSIF actual_marker IS DISTINCT FROM 'MMHVAULT-N10-MFA-STORAGE-RESTRICTIVE-V1' THEN
    RAISE EXCEPTION 'N10 Storage guard marker mismatch; refusing to remove unrelated policy';
  ELSE
    DROP POLICY mmh_n10_private_storage_mfa_guard ON storage.objects;
  END IF;
END;
$n10$;
-- The helper is retained: other N10 policies/RPCs may still call it.
-- This SQL never deletes Storage buckets/files and does not touch permissions.
COMMIT;
