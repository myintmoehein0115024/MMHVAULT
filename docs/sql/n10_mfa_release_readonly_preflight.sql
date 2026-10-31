-- MMHVAULT N10 production MFA release gate — READ ONLY.
-- No DDL, mutations, secret reads, file reads, or account changes.
-- Run prior to any production migration; abort release unless all status values
-- are TRUE and the 59-table inventory matches the source branch.
WITH expected(name) AS (
  SELECT unnest(ARRAY[
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
  ]::text[])
),
infra(name) AS (
  SELECT unnest(ARRAY[
    'mmh_n10a740_attempt_buckets',
    'mmh_n10a740_username_links',
    'mmh_n10a769_rate_buckets',
    'mmh_n10a769_recovery_phrases',
    'mmh_n10a769_signup_reservations'
  ]::text[])
),
actual AS (
  SELECT c.relname AS name,c.relrowsecurity AS rls
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
),
wallet AS (
  SELECT p.oid,p.prosecdef,
      pg_get_userbyid(p.proowner) AS owner_role
  FROM pg_proc p
  WHERE p.oid=to_regprocedure('public.mmh_delete_crypto_wallet_movement_v4(uuid)')
)
SELECT
  (SELECT count(*) FROM expected)=59 AS expected_59_ok,
  (SELECT count(*) FROM actual)=64 AS public_64_ok,
  (SELECT count(*) FROM actual JOIN expected USING(name) WHERE rls)=59 AS protected_59_rls_ok,
  (SELECT count(*) FROM actual JOIN infra USING(name) WHERE rls)=5 AS infra_5_rls_ok,
  NOT EXISTS(SELECT 1 FROM actual a
    WHERE a.name NOT IN (SELECT name FROM expected)
      AND a.name NOT IN (SELECT name FROM infra)) AS no_unreviewed_public_tables,
  NOT EXISTS(SELECT 1 FROM actual WHERE NOT rls) AS all_public_tables_rls,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname='public' AND policyname='mmh_n10_mfa_required')=0 AS public_guard_not_yet_deployed,
  to_regprocedure('mmh_n10_security.mfa_access_ok()') IS NULL AS helper_not_yet_deployed,
  (SELECT count(*) FROM storage.buckets
    WHERE id IN ('receipts','mmh-feedback','mmh-business-assets') AND public=false)=3
    AS all_three_storage_buckets_private,
  (SELECT count(*) FROM pg_policies WHERE schemaname='storage'
    AND tablename='objects' AND policyname='mmh_n10_private_storage_mfa_guard')=0
    AS storage_guard_not_yet_deployed,
  (SELECT count(*) FROM pg_policies WHERE schemaname='storage'
    AND tablename='objects'
    AND policyname IN (
      'mmhvault_receipts_select_own','mmhvault_receipts_insert_own',
      'mmhvault_receipts_update_own','mmhvault_receipts_delete_own',
      'mmh_feedback_read','mmh_feedback_upload','mmh_feedback_delete',
      'mmh_business_assets_select_own','mmh_business_assets_insert_own',
      'mmh_business_assets_update_own','mmh_business_assets_delete_own'))=11
    AS all_original_storage_owner_policies_present,
  (SELECT count(*) FROM wallet WHERE prosecdef AND owner_role='postgres')=1
    AS wallet_original_owner_and_definer_ok,
  (SELECT has_function_privilege('authenticated',oid,'EXECUTE')
   FROM wallet) AS wallet_authenticated_execute_granted,
  (SELECT NOT has_function_privilege('anon',oid,'EXECUTE')
   FROM wallet) AS wallet_anon_execute_denied,
  (SELECT obj_description(oid,'pg_proc') IS NULL FROM wallet)
   AS wallet_original_unmarked,
  (SELECT count(*) FROM pg_views WHERE schemaname='public'
     AND viewname='investment_catalog_legacy_map')=1 AS public_legacy_view_present;
