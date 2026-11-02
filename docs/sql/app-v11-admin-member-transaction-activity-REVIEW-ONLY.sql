-- MMHVAULT APP V11 — ADMIN MEMBER TRANSACTION COUNT
-- REVIEW CANDIDATE ONLY. DO NOT EXECUTE ON PRODUCTION WITHOUT
-- A NEW, EXPLICIT AUTHORISATION AND A VERIFIED ADMINISTRATOR SECURITY CHECK.
-- No account, transaction, auth or RLS table is modified.
-- Designed for Production (where public.transactions exists).
-- Staging is N10 auth-only; do not apply this migration to N10 Staging.

-- Private helper: SECURITY DEFINER is necessary to read ONLY aggregate
-- transaction metadata across members; every call is checked against the
-- existing server-side admin membership table BEFORE data is selected.
CREATE OR REPLACE FUNCTION mmh_admin.member_transaction_activity(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_total bigint := 0;
  v_last_30 bigint := 0;
  v_last_created timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT mmh_admin.is_admin() THEN
    RAISE insufficient_privilege USING MESSAGE = 'Administrator access required';
  END IF;
  IF p_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p_user_id AND NOT COALESCE(u.is_anonymous,false)
  ) THEN
    RAISE EXCEPTION 'Invalid member' USING ERRCODE='22023';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE t.created_at >= now() - interval '30 days'),
         max(t.created_at)
  INTO v_total,v_last_30,v_last_created
  FROM public.transactions t
  WHERE t.user_id = p_user_id;

  RETURN jsonb_build_object(
    'total_transactions',v_total,
    'added_last_30_days',v_last_30,
    'last_added_at',v_last_created
  );
END
$function$;

REVOKE ALL ON FUNCTION mmh_admin.member_transaction_activity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION mmh_admin.member_transaction_activity(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION mmh_admin.member_transaction_activity(uuid) TO authenticated;

-- Exposed RPC is invoker-only. It cannot run the private helper as admin
-- without that helper's own explicit auth.uid() + admin-membership check.
CREATE OR REPLACE FUNCTION public.mmh_admin_member_transaction_activity(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT mmh_admin.member_transaction_activity(p_user_id);
$function$;

REVOKE ALL ON FUNCTION public.mmh_admin_member_transaction_activity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mmh_admin_member_transaction_activity(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mmh_admin_member_transaction_activity(uuid) TO authenticated;

-- After separately approved deployment, verify:
-- 1. anon: no EXECUTE; normal signed-in non-admin: 42501; admin: counts only.
-- 2. active admin sees per-member total + last 30 days + latest created_at.
-- 3. No transaction notes, categories, amounts, dates of transaction
--    (tx_date), or personal finance details are exposed.
-- 4. admin data remains unaffected; browser user-facing RPC response is
--    limited to 3 aggregate fields.
