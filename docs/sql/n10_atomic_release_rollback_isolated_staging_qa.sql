-- N10 WHOLE ATOMIC SQL RELEASE+ROLLBACK REHEARSAL
-- Staging ONLY, NEVER PRODUCTION. All objects in mmh_n10_release_qa and mmh_n10_release_qa_security
-- No real public, storage, Auth or finance object modifications. Entire run ROLLBACK.
-- The release and rollback fragments below are derived from committed candidate SQL,
-- with schema names mechanically remapped to isolated mock fixtures.
BEGIN;
SET LOCAL statement_timeout='30000ms';
CREATE SCHEMA mmh_n10_release_qa;
REVOKE ALL ON SCHEMA mmh_n10_release_qa FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA mmh_n10_release_qa TO authenticated;
CREATE TABLE mmh_n10_release_qa.buckets(id text PRIMARY KEY, public boolean NOT NULL DEFAULT false);
INSERT INTO mmh_n10_release_qa.buckets(id,public) VALUES ('receipts',false),('mmh-feedback',false),('mmh-business-assets',false);
CREATE TABLE mmh_n10_release_qa.objects(bucket_id text NOT NULL,name text,user_id uuid NOT NULL);
ALTER TABLE mmh_n10_release_qa.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_object_owner ON mmh_n10_release_qa.objects
  FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
GRANT SELECT,INSERT,UPDATE,DELETE ON mmh_n10_release_qa.objects TO authenticated;
DO $fixtures$
DECLARE tbl text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY['budgets', 'business_accounts', 'business_expenses', 'business_inventory_adjustments', 'business_order_return_items', 'business_order_returns', 'business_partners', 'business_products', 'business_purchase_order_items', 'business_purchase_orders', 'business_purchases', 'business_quote_items', 'business_quotes', 'business_sales', 'business_sales_order_items', 'business_sales_orders', 'business_settlements', 'business_stocktake_items', 'business_stocktakes', 'businesses', 'crypto_wallet_movements', 'custom_investments', 'customer_profiles', 'exchange_rates', 'financial_goals', 'invest_auto_capture_status', 'invest_auto_crypto_quotes', 'invest_auto_daily_pnl_previews', 'invest_auto_pnl_settings', 'invest_auto_pnl_status', 'invest_auto_quote_settings', 'invest_daily_audit_snapshots', 'invest_daily_gold_quotes', 'invest_price_watch_plans', 'invest_risk_plans_v15', 'investment_catalogs', 'investments', 'life_fund_allocations', 'life_fund_movements', 'life_fund_transfers', 'life_fund_use_reconciliations', 'life_funds', 'life_goal_progress', 'life_goal_steps', 'life_goals', 'life_habit_entries', 'life_habits', 'life_schedule_events', 'life_schedule_exceptions', 'life_schedule_reminder_receipts', 'life_schedule_reminder_settings', 'life_spending_entries', 'life_spending_plans', 'life_spending_transaction_links', 'personal_configuration', 'personal_financial_alerts', 'personal_push_subscriptions', 'recurring_transactions', 'transactions', 'mmh_n10a740_attempt_buckets', 'mmh_n10a740_username_links', 'mmh_n10a769_rate_buckets', 'mmh_n10a769_recovery_phrases', 'mmh_n10a769_signup_reservations'] LOOP
   EXECUTE format('CREATE TABLE mmh_n10_release_qa.%I (id uuid PRIMARY KEY, user_id uuid NOT NULL, fee_investment_id uuid, linked_transfer_transaction_id uuid, linked_fee_transaction_id uuid)',tbl);
   EXECUTE format('ALTER TABLE mmh_n10_release_qa.%I ENABLE ROW LEVEL SECURITY',tbl);
   IF tbl IN ('budgets', 'business_accounts', 'business_expenses', 'business_inventory_adjustments', 'business_order_return_items', 'business_order_returns', 'business_partners', 'business_products', 'business_purchase_order_items', 'business_purchase_orders', 'business_purchases', 'business_quote_items', 'business_quotes', 'business_sales', 'business_sales_order_items', 'business_sales_orders', 'business_settlements', 'business_stocktake_items', 'business_stocktakes', 'businesses', 'crypto_wallet_movements', 'custom_investments', 'customer_profiles', 'exchange_rates', 'financial_goals', 'invest_auto_capture_status', 'invest_auto_crypto_quotes', 'invest_auto_daily_pnl_previews', 'invest_auto_pnl_settings', 'invest_auto_pnl_status', 'invest_auto_quote_settings', 'invest_daily_audit_snapshots', 'invest_daily_gold_quotes', 'invest_price_watch_plans', 'invest_risk_plans_v15', 'investment_catalogs', 'investments', 'life_fund_allocations', 'life_fund_movements', 'life_fund_transfers', 'life_fund_use_reconciliations', 'life_funds', 'life_goal_progress', 'life_goal_steps', 'life_goals', 'life_habit_entries', 'life_habits', 'life_schedule_events', 'life_schedule_exceptions', 'life_schedule_reminder_receipts', 'life_schedule_reminder_settings', 'life_spending_entries', 'life_spending_plans', 'life_spending_transaction_links', 'personal_configuration', 'personal_financial_alerts', 'personal_push_subscriptions', 'recurring_transactions', 'transactions') THEN
     EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON mmh_n10_release_qa.%I TO authenticated',tbl);
     EXECUTE format('CREATE POLICY qa_owner ON mmh_n10_release_qa.%I FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid())',tbl);
   END IF;
 END LOOP;
END;
$fixtures$;
CREATE OR REPLACE FUNCTION mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'mmh_n10_release_qa'
AS $function$
declare
  u uuid := auth.uid();
  r mmh_n10_release_qa.crypto_wallet_movements%rowtype;
begin
  if u is null then raise exception 'Authentication required'; end if;

  select * into r
  from mmh_n10_release_qa.crypto_wallet_movements m
  where m.id=p_id
    and m.user_id=u
  for update;

  if r.id is null then raise exception 'Wallet movement not found'; end if;

  delete from mmh_n10_release_qa.crypto_wallet_movements m
  where m.id=r.id and m.user_id=u;

  if r.fee_investment_id is not null then
    delete from mmh_n10_release_qa.investments i where i.id=r.fee_investment_id and i.user_id=u;
  end if;
  if r.linked_transfer_transaction_id is not null then
    delete from mmh_n10_release_qa.transactions t where t.id=r.linked_transfer_transaction_id and t.user_id=u;
  end if;
  if r.linked_fee_transaction_id is not null then
    delete from mmh_n10_release_qa.transactions t where t.id=r.linked_fee_transaction_id and t.user_id=u;
  end if;

  return true;
end;
$function$;

REVOKE ALL ON FUNCTION mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid) TO authenticated;

-- ===== BEGIN TRANSFORMED ATOMIC RELEASE =====
-- ========= N10 ATOMIC SEGMENT 1: docs/sql/n10_mfa_public_policy_candidate_NOT_FOR_DEPLOYMENT.sql =========
-- N10 MFA ACCESS CONTROL CANDIDATE — REVIEW ONLY, NOT PRODUCTION AUTHORIZED.
-- This is not a complete production migration until privileged RPC/Storage approval,
-- signed-token staging acceptance, backup, rollout procedure and separate authorization.
-- Source: production READ-ONLY catalog inventory 2026-10-31.
-- Omits five security infrastructure tables whose RLS currently denies client access.
-- No existing policy is deleted or replaced by this candidate.


CREATE SCHEMA IF NOT EXISTS mmh_n10_release_qa_security;
REVOKE ALL ON SCHEMA mmh_n10_release_qa_security FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA mmh_n10_release_qa_security TO authenticated;

CREATE OR REPLACE FUNCTION mmh_n10_release_qa_security.mfa_access_ok()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.uid() IS NOT NULL)
    AND (
      (auth.jwt() ->> 'aal') = 'aal2'
      OR NOT EXISTS (
        SELECT 1 FROM auth.mfa_factors AS factor
        WHERE factor.user_id = auth.uid()
          AND factor.status::text = 'verified'
      )
    ), false
  );
$$;
REVOKE ALL ON FUNCTION mmh_n10_release_qa_security.mfa_access_ok() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mmh_n10_release_qa_security.mfa_access_ok() TO authenticated;

DO $n10$
DECLARE
  tbl text;
  existing_count integer;
  unexpected_tables text;
  protected_tables text[] := ARRAY[
    'budgets',
    'business_accounts',
    'business_expenses',
    'business_inventory_adjustments',
    'business_order_return_items',
    'business_order_returns',
    'business_partners',
    'business_products',
    'business_purchase_order_items',
    'business_purchase_orders',
    'business_purchases',
    'business_quote_items',
    'business_quotes',
    'business_sales',
    'business_sales_order_items',
    'business_sales_orders',
    'business_settlements',
    'business_stocktake_items',
    'business_stocktakes',
    'businesses',
    'crypto_wallet_movements',
    'custom_investments',
    'customer_profiles',
    'exchange_rates',
    'financial_goals',
    'invest_auto_capture_status',
    'invest_auto_crypto_quotes',
    'invest_auto_daily_pnl_previews',
    'invest_auto_pnl_settings',
    'invest_auto_pnl_status',
    'invest_auto_quote_settings',
    'invest_daily_audit_snapshots',
    'invest_daily_gold_quotes',
    'invest_price_watch_plans',
    'invest_risk_plans_v15',
    'investment_catalogs',
    'investments',
    'life_fund_allocations',
    'life_fund_movements',
    'life_fund_transfers',
    'life_fund_use_reconciliations',
    'life_funds',
    'life_goal_progress',
    'life_goal_steps',
    'life_goals',
    'life_habit_entries',
    'life_habits',
    'life_schedule_events',
    'life_schedule_exceptions',
    'life_schedule_reminder_receipts',
    'life_schedule_reminder_settings',
    'life_spending_entries',
    'life_spending_plans',
    'life_spending_transaction_links',
    'personal_configuration',
    'personal_financial_alerts',
    'personal_push_subscriptions',
    'recurring_transactions',
    'transactions'
  ];
BEGIN
  -- Refuse deployment if any new public table is unprotected or lacks RLS.
  -- Five existing auth-infrastructure tables deliberately retain deny-all RLS.
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
  INTO unexpected_tables
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='mmh_n10_release_qa' AND c.relkind IN ('r','p')
    AND (NOT c.relrowsecurity OR (
      c.relname <> ALL(protected_tables)
      AND c.relname NOT IN (
        'mmh_n10a740_attempt_buckets',
        'mmh_n10a740_username_links',
        'mmh_n10a769_rate_buckets',
        'mmh_n10a769_recovery_phrases',
        'mmh_n10a769_signup_reservations'
      )
    ));
  IF unexpected_tables IS NOT NULL THEN
    RAISE EXCEPTION 'N10 unreviewed public table inventory: %', unexpected_tables;
  END IF;
  FOREACH tbl IN ARRAY protected_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'mmh_n10_release_qa' AND c.relname = tbl
        AND c.relkind IN ('r','p') AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'N10 target missing or RLS disabled: %', tbl;
    END IF;
    SELECT count(*) INTO existing_count
    FROM pg_policies
    WHERE schemaname = 'mmh_n10_release_qa'
      AND tablename = tbl
      AND policyname = 'mmh_n10_mfa_required';
    IF existing_count <> 0 THEN
      RAISE EXCEPTION 'N10 policy already exists on %, manual reconciliation required', tbl;
    END IF;
    EXECUTE format(
      'CREATE POLICY mmh_n10_mfa_required ON mmh_n10_release_qa.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((select mmh_n10_release_qa_security.mfa_access_ok())) WITH CHECK ((select mmh_n10_release_qa_security.mfa_access_ok()))',
      tbl
    );
    EXECUTE format(
      'COMMENT ON POLICY mmh_n10_mfa_required ON mmh_n10_release_qa.%I IS %L',
      tbl, 'MMHVAULT-N10-MFA-RESTRICTIVE-V1'
    );
  END LOOP;
END;
$n10$;

-- Important: service_role/BYPASSRLS and SECURITY DEFINER functions require separate guards.
-- This script does not protect Storage or privileged RPC, and must NEVER be run by itself.


-- ========= N10 ATOMIC SEGMENT 2: docs/sql/n10_mfa_storage_policy_candidate_NOT_FOR_DEPLOYMENT.sql =========
-- N10 PRIVATE STORAGE MFA GATE — REVIEW ONLY; NOT APPROVED FOR PRODUCTION.
-- Prerequisites: private bucket flags and original storage policies checked via catalog,
-- signed-token AAL1 / AAL2 / unenrolled tests in staging, signed-URL review,
-- approved backup and rollback, verified helper ownership/permissions.
-- Existing owner/administrator policies are retained; this restrictive policy is additive.

DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='mmh_n10_release_qa' AND tablename='objects'
      AND policyname='mmh_n10_private_storage_mfa_guard'
  ) THEN
    RAISE EXCEPTION 'MFA guard already exists; reconcile manually';
  END IF;
  IF EXISTS (
    SELECT 1 FROM mmh_n10_release_qa.buckets
    WHERE id IN ('receipts','mmh-feedback','mmh-business-assets')
      AND public IS TRUE
  ) THEN
    RAISE EXCEPTION 'One or more protected buckets are public';
  END IF;
  IF (SELECT count(*) FROM mmh_n10_release_qa.buckets
      WHERE id IN ('receipts','mmh-feedback','mmh-business-assets')) <> 3 THEN
    RAISE EXCEPTION 'N10 expected bucket inventory changed';
  END IF;
  IF to_regprocedure('mmh_n10_release_qa_security.mfa_access_ok()') IS NULL THEN
    RAISE EXCEPTION 'N10 MFA helper unavailable';
  END IF;
END;
$guard$;

CREATE POLICY mmh_n10_private_storage_mfa_guard
ON mmh_n10_release_qa.objects AS RESTRICTIVE FOR ALL TO authenticated
USING (
  bucket_id NOT IN ('receipts','mmh-feedback','mmh-business-assets')
  OR (SELECT mmh_n10_release_qa_security.mfa_access_ok())
)
WITH CHECK (
  bucket_id NOT IN ('receipts','mmh-feedback','mmh-business-assets')
  OR (SELECT mmh_n10_release_qa_security.mfa_access_ok())
);

COMMENT ON POLICY mmh_n10_private_storage_mfa_guard ON mmh_n10_release_qa.objects
IS 'MMHVAULT-N10-MFA-STORAGE-RESTRICTIVE-V1';

-- This policy does not revoke previously issued signed URLs, bypassRLS,
-- service-role API use, or non-storage custom Edge attachment endpoints.
-- Verify affected SELECT, INSERT, UPDATE, DELETE and upload/upsert separately.


-- ========= N10 ATOMIC SEGMENT 3: docs/sql/n10_mfa_wallet_rpc_candidate_NOT_FOR_DEPLOYMENT.sql =========
-- N10 PRIVILEGED WALLET RPC MFA GUARD CANDIDATE — NOT FOR DEPLOYMENT.
-- REVIEW ONLY. Never run against production without separate user authorization.
-- Based on production pg_get_functiondef inspected 2026-10-31.
-- Preserve existing owner/UID checks and linked-delete semantics.
-- Before any release, snapshot exact existing function definition and grants,
-- verify helper and signed-token staging behavior, inspect all dependent triggers.

DO $preflight$
BEGIN
  IF to_regprocedure('mmh_n10_release_qa_security.mfa_access_ok()') IS NULL THEN
    RAISE EXCEPTION 'N10 MFA helper unavailable';
  END IF;
  IF to_regprocedure('mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Original wallet movement RPC missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid='mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid)'::regprocedure
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
  IF position('mmh_n10_release_qa_security.mfa_access_ok()' in
       pg_get_functiondef('mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid)'::regprocedure)) > 0 THEN
    RAISE EXCEPTION 'Wallet RPC may already contain an MFA guard; reconcile manually';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  u uuid := auth.uid();
  r mmh_n10_release_qa.crypto_wallet_movements%rowtype;
BEGIN
  IF u IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000';
  END IF;
  -- SECURITY DEFINER bypasses the restrictive RLS policies when owner is privileged.
  -- The MFA condition MUST be evaluated directly at this privileged entry point.
  IF NOT COALESCE(mmh_n10_release_qa_security.mfa_access_ok(), false) THEN
    RAISE EXCEPTION 'Second factor required' USING ERRCODE='42501';
  END IF;

  SELECT * INTO r
  FROM mmh_n10_release_qa.crypto_wallet_movements m
  WHERE m.id=p_id
    AND m.user_id=u
  FOR UPDATE;

  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Wallet movement not found';
  END IF;
  DELETE FROM mmh_n10_release_qa.crypto_wallet_movements m
  WHERE m.id=r.id AND m.user_id=u;

  IF r.fee_investment_id IS NOT NULL THEN
    DELETE FROM mmh_n10_release_qa.investments i
    WHERE i.id=r.fee_investment_id AND i.user_id=u;
  END IF;
  IF r.linked_transfer_transaction_id IS NOT NULL THEN
    DELETE FROM mmh_n10_release_qa.transactions t
    WHERE t.id=r.linked_transfer_transaction_id AND t.user_id=u;
  END IF;
  IF r.linked_fee_transaction_id IS NOT NULL THEN
    DELETE FROM mmh_n10_release_qa.transactions t
    WHERE t.id=r.linked_fee_transaction_id AND t.user_id=u;
  END IF;
  RETURN TRUE;
END;
$function$;
COMMENT ON FUNCTION mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid)
IS 'MMHVAULT-N10-WALLET-MFA-V1';
-- CREATE OR REPLACE preserves the function identity and existing EXECUTE grants.
-- Check owner and all grants again after deployment.
-- ===== ASSERT ALL RELEASE GUARDS =====
DO $verify_release$
DECLARE n integer; s integer; w integer;
BEGIN
 SELECT count(*) INTO n FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='mmh_n10_release_qa' AND p.polname='mmh_n10_mfa_required'
 AND NOT p.polpermissive AND obj_description(p.oid,'pg_policy')='MMHVAULT-N10-MFA-RESTRICTIVE-V1';
 IF n<>59 THEN RAISE EXCEPTION 'Expected 59 restrictive release policies, got %', n; END IF;
 SELECT count(*) INTO s FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='mmh_n10_release_qa' AND c.relname='objects'
 AND p.polname='mmh_n10_private_storage_mfa_guard'
 AND NOT p.polpermissive AND obj_description(p.oid,'pg_policy')='MMHVAULT-N10-MFA-STORAGE-RESTRICTIVE-V1';
 IF s<>1 THEN RAISE EXCEPTION 'Private attachment release guard missing'; END IF;
 SELECT count(*) INTO w FROM pg_proc p WHERE
 p.oid='mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid)'::regprocedure
 AND obj_description(p.oid,'pg_proc')='MMHVAULT-N10-WALLET-MFA-V1'
 AND position('mmh_n10_release_qa_security.mfa_access_ok()' in pg_get_functiondef(p.oid))>0;
 IF w<>1 THEN RAISE EXCEPTION 'Privileged wallet release guard missing'; END IF;
END;
$verify_release$;
-- ===== BEGIN TRANSFORMED ATOMIC ROLLBACK =====
DO $inventory$
DECLARE marked integer;
BEGIN
 SELECT count(*) INTO marked
 FROM pg_policy p
 JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='mmh_n10_release_qa' AND p.polname='mmh_n10_mfa_required'
   AND obj_description(p.oid,'pg_policy')='MMHVAULT-N10-MFA-RESTRICTIVE-V1';
 IF marked <> 59 THEN
   RAISE EXCEPTION 'Expected 59 marked N10 RLS policies for atomic rollback; observed %', marked;
 END IF;
END;
$inventory$;

-- ====== ROLLBACK PART 1: docs/sql/n10_mfa_wallet_rpc_rollback_CANDIDATE.sql ======
-- N10 WALLET RPC ROLLBACK CANDIDATE — NEVER AUTOMATICALLY DEPLOY.
-- Exact mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid) function DDL captured
-- READ ONLY from production 2026-10-31. Prior search_path was mmh_n10_release_qa.
-- Do not use if the wallet function has changed after that snapshot.
-- This function runs SECURITY DEFINER and needs a coordinated MFA rollout.

DO $guard$
DECLARE actual_marker text;
BEGIN
  SELECT obj_description(p.oid,'pg_proc') INTO actual_marker
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='mmh_n10_release_qa' AND p.proname='mmh_delete_crypto_wallet_movement_v4'
    AND pg_get_function_identity_arguments(p.oid)='p_id uuid';
  IF actual_marker IS DISTINCT FROM 'MMHVAULT-N10-WALLET-MFA-V1' THEN
    RAISE EXCEPTION 'Wallet RPC marker absent or altered; rollback refused';
  END IF;
  IF position('mmh_n10_release_qa_security.mfa_access_ok()' in
      pg_get_functiondef('mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid)'::regprocedure))=0 THEN
    RAISE EXCEPTION 'Wallet RPC does not match an N10 MFA guarded version';
  END IF;
END;
$guard$;
CREATE OR REPLACE FUNCTION mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'mmh_n10_release_qa'
AS $function$
declare
  u uuid := auth.uid();
  r mmh_n10_release_qa.crypto_wallet_movements%rowtype;
begin
  if u is null then raise exception 'Authentication required'; end if;

  select * into r
  from mmh_n10_release_qa.crypto_wallet_movements m
  where m.id=p_id
    and m.user_id=u
  for update;

  if r.id is null then raise exception 'Wallet movement not found'; end if;

  delete from mmh_n10_release_qa.crypto_wallet_movements m
  where m.id=r.id and m.user_id=u;

  if r.fee_investment_id is not null then
    delete from mmh_n10_release_qa.investments i where i.id=r.fee_investment_id and i.user_id=u;
  end if;
  if r.linked_transfer_transaction_id is not null then
    delete from mmh_n10_release_qa.transactions t where t.id=r.linked_transfer_transaction_id and t.user_id=u;
  end if;
  if r.linked_fee_transaction_id is not null then
    delete from mmh_n10_release_qa.transactions t where t.id=r.linked_fee_transaction_id and t.user_id=u;
  end if;

  return true;
end;
$function$;
COMMENT ON FUNCTION mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid) IS NULL;
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
  WHERE n.nspname='mmh_n10_release_qa' AND c.relname='objects'
    AND p.polname='mmh_n10_private_storage_mfa_guard';

  IF policy_oid IS NULL THEN
    RAISE NOTICE 'N10 Storage MFA policy absent; nothing to remove';
  ELSIF actual_marker IS DISTINCT FROM 'MMHVAULT-N10-MFA-STORAGE-RESTRICTIVE-V1' THEN
    RAISE EXCEPTION 'N10 Storage guard marker mismatch; refusing to remove unrelated policy';
  ELSE
    DROP POLICY mmh_n10_private_storage_mfa_guard ON mmh_n10_release_qa.objects;
  END IF;
END;
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
    WHERE n.nspname='mmh_n10_release_qa'
      AND p.polname='mmh_n10_mfa_required'
      AND obj_description(p.oid, 'pg_policy')='MMHVAULT-N10-MFA-RESTRICTIVE-V1'
  LOOP
    EXECUTE format('DROP POLICY mmh_n10_mfa_required ON %I.%I',
       row_record.schemaname, row_record.tablename);
  END LOOP;
END;
$n10$;
-- Intentionally retain the helper and schema: deployed RPC and Storage policies
-- may still reference the function. Only remove once dependency audits pass.
-- ===== ASSERT EXACT ROLLBACK REVERT =====
DO $verify_rollback$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='mmh_n10_release_qa' AND p.polname IN ('mmh_n10_mfa_required','mmh_n10_private_storage_mfa_guard');
 IF n<>0 THEN RAISE EXCEPTION 'Rollback left % MFA policies',n; END IF;
 IF (SELECT obj_description('mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid)'::regprocedure,'pg_proc')) IS NOT NULL
 THEN RAISE EXCEPTION 'Wallet release marker not removed'; END IF;
 IF position('mmh_n10_release_qa_security.mfa_access_ok()' in pg_get_functiondef('mmh_n10_release_qa.mmh_delete_crypto_wallet_movement_v4(uuid)'::regprocedure))>0
 THEN RAISE EXCEPTION 'Wallet function body not restored'; END IF;
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='mmh_n10_release_qa' AND c.relkind='r')<>66
 THEN RAISE EXCEPTION 'Isolation fixture inventory damaged'; END IF;
END;
$verify_rollback$;
SELECT 59 AS restrictive_business_policies_tested, 1 AS storage_guard_tested, 1 AS wallet_function_tested,
       true AS release_and_rollback_verified, true AS outer_transaction_rolled_back;
ROLLBACK;
