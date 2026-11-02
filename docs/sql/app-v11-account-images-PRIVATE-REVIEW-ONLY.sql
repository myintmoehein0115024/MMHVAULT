-- MMHVAULT APP V11 · PRIVATE ACCOUNT IMAGE SYNC — REVIEW ONLY / DO NOT EXECUTE
-- For separately authorized Production rollout only; never touch N10 Auth Staging.
-- New table only. No existing account, transaction, auth, currency, or RLS changes.
-- Small 128×128 client-resized images stored as data URL. An empty string is an
-- explicit removal/tombstone so old images do not reappear on other devices.
CREATE TABLE IF NOT EXISTS public.mmh_account_images_v11 (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  image_data text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mmh_account_images_v11_pk PRIMARY KEY (user_id, account_id),
  CONSTRAINT mmh_account_images_v11_account_id_length
    CHECK (char_length(account_id) BETWEEN 1 AND 120),
  CONSTRAINT mmh_account_images_v11_image_format
    CHECK (
      image_data = '' OR (
        octet_length(image_data) <= 160000 AND
        image_data ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'
      )
    )
);
ALTER TABLE public.mmh_account_images_v11 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.mmh_account_images_v11 FROM PUBLIC;
REVOKE ALL ON TABLE public.mmh_account_images_v11 FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.mmh_account_images_v11 TO authenticated;

CREATE POLICY "account_images_select_self_v11"
ON public.mmh_account_images_v11 FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "account_images_insert_self_v11"
ON public.mmh_account_images_v11 FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "account_images_update_self_v11"
ON public.mmh_account_images_v11 FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Verify prior to approving migration:
-- (1) anon role has no SELECT/INSERT/UPDATE; authenticated can only see self.
-- (2) cross-user select, insert, update denied; foreign user_id cannot be set.
-- (3) null, overlong, malformed or unsafe image data rejected.
-- (4) an empty image_data tombstone clears an account logo cross-device.
-- (5) existing accounts / transactions are unchanged.
-- ROLLBACK PLAN: Disable client feature and keep local images untouched.
-- Do not drop the table until member images have been safely exported.
