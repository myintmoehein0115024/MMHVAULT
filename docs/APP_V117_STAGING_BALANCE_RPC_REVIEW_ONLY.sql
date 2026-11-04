-- REVIEW ONLY / DO NOT APPLY without separate explicit owner approval.
-- Target ONLY Supabase Auth-Staging ldivswlhtgmznzwhzsoi.
-- APP V11.7 QA-only readonly balance RPC used by the legacy V175
-- Expense/Transfer submit guard. No Production, N10 or RLS changes.
-- IMPORTANT: in this minimal sandbox, investments/custom_investments/wallet
-- must remain empty. If they ever contain data, this RPC FAILS CLOSED.
--
-- After approval apply to that project ONLY and update the independent
-- Staging CSP to permit exactly:
-- https://ldivswlhtgmznzwhzsoi.supabase.co/rest/v1/rpc/mmh_personal_account_balance
-- No broad /rest/v1/* grant, no other RPC grant.

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.transactions') IS NULL
     OR to_regclass('public.personal_configuration') IS NULL
     OR to_regclass('public.investments') IS NULL
     OR to_regclass('public.custom_investments') IS NULL
     OR to_regclass('public.crypto_wallet_movements') IS NULL
  THEN
    RAISE EXCEPTION 'APP V11.7 isolated Staging tables missing; abort';
  END IF;
  IF to_regprocedure('public.mmh_personal_account_balance(uuid,text,bigint,bigint)') IS NOT NULL THEN
    RAISE EXCEPTION 'Balance RPC already exists; never replace it automatically';
  END IF;
END;
$preflight$;

CREATE FUNCTION public.mmh_personal_account_balance(
  p_user_id uuid,
  p_account_name text,
  p_exclude_transaction_id bigint,
  p_exclude_investment_id bigint
) RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $body$
DECLARE
  v_owner uuid;
  v_name text;
  v_account_matches integer;
  v_balance numeric;
BEGIN
  v_owner := auth.uid();
  IF v_owner IS NULL OR v_owner IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Only the signed-in owner can check this balance'
      USING ERRCODE='42501';
  END IF;
  v_name := lower(btrim(p_account_name));
  IF v_name IS NULL OR v_name = '' OR p_exclude_investment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Unsupported Staging balance request'
      USING ERRCODE='22023';
  END IF;

  -- Verify that the account belongs to the signed-in owner, not merely
  -- that a transaction happens to contain the caller-supplied name.
  SELECT count(*) INTO v_account_matches
  FROM public.personal_configuration c,
       LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(c.config->'accounts') = 'array'
         THEN c.config->'accounts' ELSE '[]'::jsonb END
       ) a
  WHERE c.user_id = v_owner
    AND lower(btrim(a.value->>'name')) = v_name
    AND coalesce(a.value->>'archived','false') <> 'true';
  IF v_account_matches <> 1 THEN
    RAISE EXCEPTION 'Account is missing or ambiguous in this owner configuration'
      USING ERRCODE='22023';
  END IF;

  -- The approved extra finance tables are intentionally read-only
  -- startup placeholders with no full investment accounting columns.
  -- Never silently report a partial balance after they are used.
  IF EXISTS (SELECT 1 FROM public.investments WHERE user_id=v_owner)
     OR EXISTS (SELECT 1 FROM public.custom_investments WHERE user_id=v_owner)
     OR EXISTS (SELECT 1 FROM public.crypto_wallet_movements WHERE user_id=v_owner)
     OR EXISTS (
       SELECT 1 FROM public.transactions
       WHERE user_id=v_owner AND category='Investment'
         AND coalesce(note,'') LIKE 'Investment:%'
     )
  THEN
    RAISE EXCEPTION 'Staging balance QA unsupported with investment or wallet activity'
      USING ERRCODE='P0001';
  END IF;

  SELECT coalesce(sum(
    CASE WHEN lower(btrim(to_account))=v_name THEN coalesce(to_amount,0) ELSE 0 END -
    CASE WHEN lower(btrim(from_account))=v_name THEN coalesce(from_amount,0) ELSE 0 END
  ),0) INTO v_balance
  FROM public.transactions
  WHERE user_id=v_owner
    AND (p_exclude_transaction_id IS NULL OR id <> p_exclude_transaction_id);
  RETURN v_balance;
END;
$body$;

REVOKE ALL ON FUNCTION public.mmh_personal_account_balance(uuid,text,bigint,bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mmh_personal_account_balance(uuid,text,bigint,bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.mmh_personal_account_balance(uuid,text,bigint,bigint) TO authenticated;
COMMIT;
