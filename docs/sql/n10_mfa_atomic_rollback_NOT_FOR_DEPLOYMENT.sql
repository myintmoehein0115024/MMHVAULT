-- MMHVAULT N10 ATOMIC MFA ROLLBACK — REVIEW ONLY, NOT AUTHORIZED.
-- Must accompany only an owner-approved atomic N10 release; no automated prod jobs.
-- It restores the wallet's exact snapshotted body and drops N10-added restrictive
-- Storage/public policies. It DOES NOT delete any financial or Storage files.
-- FIRST verify the user can safely resume normal login and that this rollback
-- will not inadvertently open a security bypass; emergency rollback requires
-- coordinated disabling of affected APIs and version review.
BEGIN;
DO $inventory$
DECLARE marked integer;
BEGIN
 SELECT count(*) INTO marked
 FROM pg_policy p
 JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND p.polname='mmh_n10_mfa_required'
   AND obj_description(p.oid,'pg_policy')='MMHVAULT-N10-MFA-RESTRICTIVE-V1';
 IF marked <> 59 THEN
   RAISE EXCEPTION 'Expected 59 marked N10 RLS policies for atomic rollback; observed %', marked;
 END IF;
END
$inventory$;

-- ====== ROLLBACK PART 1: docs/sql/n10_mfa_wallet_rpc_rollback_CANDIDATE.sql ======
-- N10 WALLET RPC ROLLBACK CANDIDATE — NEVER AUTOMATICALLY DEPLOY.
-- Exact public.mmh_delete_crypto_wallet_movement_v4(uuid) function DDL captured
-- READ ONLY from production 2026-10-31. Prior search_path was public.
-- Do not use if the wallet function has changed after that snapshot.
-- This function runs SECURITY DEFINER and needs a coordinated MFA rollout.

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

-- ====== ROLLBACK PART 2: docs/sql/n10_mfa_storage_rollback_CANDIDATE.sql ======
-- N10 Storage guard rollback CANDIDATE — REVIEW ONLY, NEVER PRODUCTION AUTOMATIC.
-- This removes ONLY the newly added N10 restrictive policy, preserving every
-- existing Storage bucket, permissive owner policy, data, and object.
-- Roll back in a coordinated release window with financial API and public policies.

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
END
$n10$;
-- The helper is retained: other N10 policies/RPCs may still call it.
-- This SQL never deletes Storage buckets/files and does not touch permissions.

-- ====== ROLLBACK PART 3: docs/sql/n10_mfa_policy_rollback_CANDIDATE.sql ======
-- N10 MFA RLS policy candidate rollback — NEVER RUN WITHOUT AUTHORIZATION.
-- Only rolls back policies with the exact N10 marker created by the matching candidate.
-- Does NOT revert any other policy, grant, data, Storage or privileged RPC changes.
-- A production rollback must be separately rehearsed and coordinated with back-end
-- function changes to avoid opening an MFA bypass during a partial deployment.


DO $n10$
DECLARE row_record record;
BEGIN
  FOR row_record IN
    SELECT n.nspname AS schemaname, c.relname AS tablename
    FROM pg_policy p
    JOIN pg_class c ON c.oid=p.polrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND p.polname='mmh_n10_mfa_required'
      AND obj_description(p.oid, 'pg_policy')='MMHVAULT-N10-MFA-RESTRICTIVE-V1'
  LOOP
    EXECUTE format('DROP POLICY mmh_n10_mfa_required ON %I.%I',
       row_record.schemaname, row_record.tablename);
  END LOOP;
END
$n10$;
-- Intentionally retain the helper and schema: deployed RPC and Storage policies
-- may still reference the function. Only remove once dependency audits pass.
COMMIT;
