-- MMHVAULT N10 POST-RELEASE MFA VALIDATION — READ ONLY, NOT TO BE RUN NOW.
-- Execute ONLY after an explicitly authorized coordinated release.
-- No production data is read beyond catalog metadata; NO DDL or mutations.
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
    'mmh_n10a740_attempt_buckets','mmh_n10a740_username_links',
    'mmh_n10a769_rate_buckets','mmh_n10a769_recovery_phrases',
    'mmh_n10a769_signup_reservations'
  ]::text[])
),
actual AS (
  SELECT c.relname AS name,c.relrowsecurity AS rls
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
),
n10_policies AS (
  SELECT c.relname AS name,p.*,obj_description(p.oid,'pg_policy') AS marker,
    pg_get_expr(p.polqual,p.polrelid) AS condition_using,
    pg_get_expr(p.polwithcheck,p.polrelid) AS condition_check
  FROM pg_policy p
  JOIN pg_class c ON c.oid=p.polrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND p.polname='mmh_n10_mfa_required'
),
storage_guard AS (
  SELECT p.*,obj_description(p.oid,'pg_policy') AS marker,
    pg_get_expr(p.polqual,p.polrelid) AS condition_using,
    pg_get_expr(p.polwithcheck,p.polrelid) AS condition_check
  FROM pg_policy p
  JOIN pg_class c ON c.oid=p.polrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='storage' AND c.relname='objects'
   AND p.polname='mmh_n10_private_storage_mfa_guard'
),
wallet AS (
  SELECT p.oid,p.prosecdef,p.proconfig,pg_get_userbyid(p.proowner) AS owner_role,
    obj_description(p.oid,'pg_proc') AS marker,pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  WHERE p.oid=to_regprocedure('public.mmh_delete_crypto_wallet_movement_v4(uuid)')
),
helper AS (
  SELECT p.oid,p.prosecdef,pg_get_userbyid(p.proowner) AS owner_role
  FROM pg_proc p
  WHERE p.oid=to_regprocedure('mmh_n10_security.mfa_access_ok()')
),
authrole AS (
  SELECT oid FROM pg_roles WHERE rolname='authenticated'
)
SELECT
  (SELECT count(*) FROM expected)=59 AS exact_expected_tables,
  (SELECT count(*) FROM actual)=64 AS exact_public_table_inventory,
  (SELECT count(*) FROM actual WHERE rls)=64 AS all_public_tables_rls,
  (SELECT count(*) FROM actual JOIN expected USING(name) WHERE rls)=59 AS all_business_tables_present,
  (SELECT count(*) FROM actual JOIN infra USING(name) WHERE rls)=5 AS internal_tables_preserved,
  NOT EXISTS(SELECT 1 FROM actual
    WHERE name NOT IN (SELECT name FROM expected)
      AND name NOT IN (SELECT name FROM infra)) AS no_unreviewed_public_tables,
  (SELECT count(*) FROM n10_policies)=59 AS all_59_n10_policies_exist,
  (SELECT count(*) FROM n10_policies WHERE
    name IN (SELECT name FROM expected)
    AND marker='MMHVAULT-N10-MFA-RESTRICTIVE-V1'
    AND polpermissive=false AND polcmd='*'
    AND (SELECT oid FROM authrole)=ANY(polroles)
    AND position('mfa_access_ok' IN condition_using)>0
    AND position('mfa_access_ok' IN condition_check)>0
  )=59 AS all_59_policies_restrictive_and_marked,
  (SELECT count(*) FROM helper WHERE prosecdef AND owner_role='postgres')=1 AS mfa_helper_privileged_and_present,
  to_regprocedure('mmh_n10_security.mfa_access_ok()') IS NOT NULL AS mfa_helper_resolves,
  (SELECT count(*) FROM storage.buckets WHERE
    id IN ('receipts','mmh-feedback','mmh-business-assets') AND public=false)=3
    AS all_private_storage_buckets_preserved,
  (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
    AND policyname IN ('mmhvault_receipts_select_own','mmhvault_receipts_insert_own',
    'mmhvault_receipts_update_own','mmhvault_receipts_delete_own',
    'mmh_feedback_read','mmh_feedback_upload','mmh_feedback_delete',
    'mmh_business_assets_select_own','mmh_business_assets_insert_own',
    'mmh_business_assets_update_own','mmh_business_assets_delete_own'))=11
    AS original_storage_owner_policies_preserved,
  (SELECT count(*) FROM storage_guard WHERE
    marker='MMHVAULT-N10-MFA-STORAGE-RESTRICTIVE-V1'
    AND polpermissive=false AND polcmd='*'
    AND (SELECT oid FROM authrole)=ANY(polroles)
    AND position('mfa_access_ok' IN condition_using)>0
    AND position('mfa_access_ok' IN condition_check)>0)=1
    AS storage_guard_marked_and_restrictive,
  (SELECT count(*) FROM wallet WHERE
    marker='MMHVAULT-N10-WALLET-MFA-V1'
    AND prosecdef=true AND owner_role='postgres'
    AND position('mmh_n10_security.mfa_access_ok()' IN definition)>0)=1
    AS wallet_privileged_mfa_guard_enabled,
  (SELECT has_function_privilege('authenticated',oid,'EXECUTE') FROM wallet)=true
    AS wallet_authenticated_access_preserved,
  (SELECT has_function_privilege('anon',oid,'EXECUTE') FROM wallet)=false
    AS wallet_anonymous_access_denied,
  EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='investment_catalog_legacy_map'
      AND c.relkind='v' AND 'security_invoker=true'=ANY(c.reloptions))
    AS catalog_view_invoker_rls_preserved;
