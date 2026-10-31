-- MMHVAULT N10 ATOMIC MFA RELEASE PACKAGE — NOT FOR DEPLOYMENT.
-- Prepared only for review and future scoped authorization.
-- DO NOT apply to production without explicit owner approval, full backup,
-- all 16 live read-only preflight checks TRUE, account recovery plan,
-- signed-URL/Edge safety review, and a verified rollback window.
-- All 59 business policies, 3 private bucket MFA guard and privileged wallet
-- RPC are committed together, never one-by-one.
-- No financial rows are deleted or rewritten by this candidate.
BEGIN;


-- ========= N10 ATOMIC SEGMENT 1: docs/sql/n10_mfa_public_policy_candidate_NOT_FOR_DEPLOYMENT.sql =========
-- N10 MFA ACCESS CONTROL CANDIDATE — REVIEW ONLY, NOT PRODUCTION AUTHORIZED.
-- This is not a complete production migration until privileged RPC/Storage approval,
-- signed-token staging acceptance, backup, rollout procedure and separate authorization.
-- Source: production READ-ONLY catalog inventory 2026-10-31.
-- Omits five security infrastructure tables whose RLS currently denies client access.
-- No existing policy is deleted or replaced by this candidate.


CREATE SCHEMA IF NOT EXISTS mmh_n10_security;
REVOKE ALL ON SCHEMA mmh_n10_security FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA mmh_n10_security TO authenticated;

CREATE OR REPLACE FUNCTION mmh_n10_security.mfa_access_ok()
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
REVOKE ALL ON FUNCTION mmh_n10_security.mfa_access_ok() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mmh_n10_security.mfa_access_ok() TO authenticated;

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
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
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
      WHERE n.nspname = 'public' AND c.relname = tbl
        AND c.relkind IN ('r','p') AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'N10 target missing or RLS disabled: %', tbl;
    END IF;
    SELECT count(*) INTO existing_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = tbl
      AND policyname = 'mmh_n10_mfa_required';
    IF existing_count <> 0 THEN
      RAISE EXCEPTION 'N10 policy already exists on %, manual reconciliation required', tbl;
    END IF;
    EXECUTE format(
      'CREATE POLICY mmh_n10_mfa_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((select mmh_n10_security.mfa_access_ok())) WITH CHECK ((select mmh_n10_security.mfa_access_ok()))',
      tbl
    );
    EXECUTE format(
      'COMMENT ON POLICY mmh_n10_mfa_required ON public.%I IS %L',
      tbl, 'MMHVAULT-N10-MFA-RESTRICTIVE-V1'
    );
  END LOOP;
END
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

COMMENT ON POLICY mmh_n10_private_storage_mfa_guard ON storage.objects
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
