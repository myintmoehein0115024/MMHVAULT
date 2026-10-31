-- N10 WALLET RPC ROLLBACK CANDIDATE — NEVER AUTOMATICALLY DEPLOY.
-- Exact public.mmh_delete_crypto_wallet_movement_v4(uuid) function DDL captured
-- READ ONLY from production 2026-10-31. Prior search_path was public.
-- Do not use if the wallet function has changed after that snapshot.
-- This function runs SECURITY DEFINER and needs a coordinated MFA rollout.
BEGIN;
DO $guard$
DECLARE actual_marker text;
BEGIN
  SELECT obj_description(p.oid,'pg_proc') INTO actual_marker
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='mmh_delete_crypto_wallet_movement_v4'
    AND pg_get_function_identity_arguments(p.oid)='p_id uuid';
  IF actual_marker IS DISTINCT FROM 'MMHVAULT-N10-WALLET-MFA-V1' THEN
    RAISE EXCEPTION 'Wallet RPC marker absent or altered; rollback refused';
  END IF;
  IF position('mmh_n10_security.mfa_access_ok()' in
      pg_get_functiondef('public.mmh_delete_crypto_wallet_movement_v4(uuid)'::regprocedure))=0 THEN
    RAISE EXCEPTION 'Wallet RPC does not match an N10 MFA guarded version';
  END IF;
END
$guard$;
CREATE OR REPLACE FUNCTION public.mmh_delete_crypto_wallet_movement_v4(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  u uuid := auth.uid();
  r public.crypto_wallet_movements%rowtype;
begin
  if u is null then raise exception 'Authentication required'; end if;

  select * into r
  from public.crypto_wallet_movements m
  where m.id=p_id
    and m.user_id=u
  for update;

  if r.id is null then raise exception 'Wallet movement not found'; end if;

  delete from public.crypto_wallet_movements m
  where m.id=r.id and m.user_id=u;

  if r.fee_investment_id is not null then
    delete from public.investments i where i.id=r.fee_investment_id and i.user_id=u;
  end if;
  if r.linked_transfer_transaction_id is not null then
    delete from public.transactions t where t.id=r.linked_transfer_transaction_id and t.user_id=u;
  end if;
  if r.linked_fee_transaction_id is not null then
    delete from public.transactions t where t.id=r.linked_fee_transaction_id and t.user_id=u;
  end if;

  return true;
end;
$function$
COMMENT ON FUNCTION public.mmh_delete_crypto_wallet_movement_v4(uuid) IS NULL;
-- CREATE OR REPLACE retains the existing function OID, owner and EXECUTE grants;
-- separately confirm grants, owner and intended behavior after rollback.
COMMIT;
