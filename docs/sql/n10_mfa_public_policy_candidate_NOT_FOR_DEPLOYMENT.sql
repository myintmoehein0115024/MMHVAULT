-- N10 MFA ACCESS CONTROL CANDIDATE — REVIEW ONLY, NOT PRODUCTION AUTHORIZED.
-- This is not a complete production migration until privileged RPC/Storage approval,
-- signed-token staging acceptance, backup, rollout procedure and separate authorization.
-- Source: production READ-ONLY catalog inventory 2026-10-31.
-- Omits five security infrastructure tables whose RLS currently denies client access.
-- No existing policy is deleted or replaced by this candidate.

BEGIN;

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
COMMIT;
