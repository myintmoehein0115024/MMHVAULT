-- N10 PRIVATE STORAGE MFA GATE — REVIEW ONLY; NOT APPROVED FOR PRODUCTION.
-- Prerequisites: private bucket flags and original storage policies checked via catalog,
-- signed-token AAL1 / AAL2 / unenrolled tests in staging, signed-URL review,
-- approved backup and rollback, verified helper ownership/permissions.
-- Existing owner/administrator policies are retained; this restrictive policy is additive.
BEGIN;
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='mmh_n10_private_storage_mfa_guard'
  ) THEN
    RAISE EXCEPTION 'MFA guard already exists; reconcile manually';
  END IF;
  IF EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id IN ('receipts','mmh-feedback','mmh-business-assets')
      AND public IS TRUE
  ) THEN
    RAISE EXCEPTION 'One or more protected buckets are public';
  END IF;
  IF (SELECT count(*) FROM storage.buckets
      WHERE id IN ('receipts','mmh-feedback','mmh-business-assets')) <> 3 THEN
    RAISE EXCEPTION 'N10 expected bucket inventory changed';
  END IF;
  IF to_regprocedure('mmh_n10_security.mfa_access_ok()') IS NULL THEN
    RAISE EXCEPTION 'N10 MFA helper unavailable';
  END IF;
END;
$guard$;

CREATE POLICY mmh_n10_private_storage_mfa_guard
ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING (
  bucket_id NOT IN ('receipts','mmh-feedback','mmh-business-assets')
  OR (SELECT mmh_n10_security.mfa_access_ok())
)
WITH CHECK (
  bucket_id NOT IN ('receipts','mmh-feedback','mmh-business-assets')
  OR (SELECT mmh_n10_security.mfa_access_ok())
);

-- This policy does not revoke previously issued signed URLs, bypassRLS,
-- service-role API use, or non-storage custom Edge attachment endpoints.
-- Verify affected SELECT, INSERT, UPDATE, DELETE and upload/upsert separately.
COMMIT;
