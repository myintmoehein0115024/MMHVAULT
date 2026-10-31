-- N10 PRIVILEGED WALLET RPC MFA GUARD CANDIDATE — NOT FOR DEPLOYMENT.
-- REVIEW ONLY. Never run against production without separate user authorization.
-- Based on production pg_get_functiondef inspected 2026-10-31.
-- Preserve existing owner/UID checks and linked-delete semantics.
-- Before any release, snapshot exact existing function definition and grants,
-- verify helper and signed-token staging behavior, inspect all dependent triggers.
BEGIN;
DO $preflight$
BEGIN
  IF to_regprocedure('mmh_n10_security.mfa_access_ok()') IS NULL THEN
    RAISE EXCEPTION 'N10 MFA helper unavailable';
  END IF;
  IF to_regprocedure('public.mmh_delete_crypto_wallet_movement_v4(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Original wallet movement RPC missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid='public.mmh_delete_crypto_wallet_movement_v4(uuid)'::regprocedure
      AND (
        NOT p.prosecdef
        OR pg_get_userbyid(p.proowner)<>'postgres'
        OR obj_description(p.oid,'pg_proc') IS NOT NULL
        OR NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
        OR has_function_privilege('anon',p.oid,'EXECUTE')
      )
  ) THEN
    RAISE EXCEPTION 'Production wallet RPC ownership, grants or baseline changed';
  END IF;
  IF position('mmh_n10_security.mfa_access_ok()' in
       pg_get_functiondef('public.mmh_delete_crypto_wallet_movement_v4(uuid)'::regprocedure)) > 0 THEN
    RAISE EXCEPTION 'Wallet RPC may already contain an MFA guard; reconcile manually';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.mmh_delete_crypto_wallet_movement_v4(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  u uuid := auth.uid();
  r public.crypto_wallet_movements%rowtype;
BEGIN
  IF u IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000';
  END IF;
  -- SECURITY DEFINER bypasses the restrictive RLS policies when owner is privileged.
  -- The MFA condition MUST be evaluated directly at this privileged entry point.
  IF NOT COALESCE(mmh_n10_security.mfa_access_ok(), false) THEN
    RAISE EXCEPTION 'Second factor required' USING ERRCODE='42501';
  END IF;

  SELECT * INTO r
  FROM public.crypto_wallet_movements m
  WHERE m.id=p_id
    AND m.user_id=u
  FOR UPDATE;

  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Wallet movement not found';
  END IF;
  DELETE FROM public.crypto_wallet_movements m
  WHERE m.id=r.id AND m.user_id=u;

  IF r.fee_investment_id IS NOT NULL THEN
    DELETE FROM public.investments i
    WHERE i.id=r.fee_investment_id AND i.user_id=u;
  END IF;
  IF r.linked_transfer_transaction_id IS NOT NULL THEN
    DELETE FROM public.transactions t
    WHERE t.id=r.linked_transfer_transaction_id AND t.user_id=u;
  END IF;
  IF r.linked_fee_transaction_id IS NOT NULL THEN
    DELETE FROM public.transactions t
    WHERE t.id=r.linked_fee_transaction_id AND t.user_id=u;
  END IF;
  RETURN TRUE;
END;
$function$;
COMMENT ON FUNCTION public.mmh_delete_crypto_wallet_movement_v4(uuid)
IS 'MMHVAULT-N10-WALLET-MFA-V1';
-- CREATE OR REPLACE preserves the function identity and existing EXECUTE grants.
-- Check owner and all grants again after deployment.
COMMIT;
