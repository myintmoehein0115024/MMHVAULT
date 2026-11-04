# MMHVAULT APP V11.7 — authorized minimal Auth-Staging boot tables

Date: 2026-11-04. Status: **three empty read-only boot tables created in Auth-Staging after separate user approval; security-verified**.
Production project: explicitly OUT OF SCOPE. Auth-Staging: `ldivswlhtgmznzwhzsoi` only.
This records a narrowly scoped Staging-only schema change, **not a Production migration or full APP sign-off**.

## 1. Verified pre-migration Auth-Staging baseline

The connected read-only Supabase table inventory reports **17** existing public tables, of which **15** are existing N10 QA tables and **two** are the approved APP V11.7 finance sandbox tables:
- `public.transactions`: zero rows, RLS enabled; owner UUID foreign-key to `auth.users`; primary key `id`.
- `public.personal_configuration`: zero rows, RLS enabled; owner UUID primary/foreign key, `config jsonb`.
- The two financial tables have eight owner-scoped RLS policies in total (SELECT / INSERT / UPDATE / DELETE for each), checked from read-only `pg_policies`.
- Preflight made no changes; only the separately approved three empty tables were created in the next step. Production was never accessed.

## 2. Actual full APP source contract

Read-only CI inspected the current PR #87 full `app.html` and its actual `loadAll()`/shared reader:
- `mmhPersonalReadAllV191(table, owner)` selects `*`, filters `user_id = owner`, sorts by **id** (except unrelated special tables), pages results, and rejects account switches.
- `loadAll()` performs these hard-failure reads: `transactions` sorted by `tx_date`, `investments` sorted by `inv_date`, `custom_investments` sorted by `inv_date`, and `crypto_wallet_movements` sorted by `movement_date` / `created_at` via the wallet helper.
- Owner validation, hard errors and the privacy overlay must remain active.
- `exchange_rates` has an optional failed-read path during this startup phase, not a hard-stop; testing actual exchange-rate calculations is a separate release gate.

| Table | Status | Minimum *read* fields inferred from current code | Authorization |
| --- | --- | --- | --- |
| `transactions` | Exists, 0 rows | `id,user_id,tx_date` plus existing ledger columns | Already approved |
| `personal_configuration` | Exists, 0 rows | `user_id,config,updated_at` | Already approved |
| `investments` | **Created, 0 rows** | `id bigint identity,user_id uuid,inv_date date,created_at timestamptz` | Authenticated SELECT only |
| `custom_investments` | **Created, 0 rows** | `id bigint identity,user_id uuid,inv_date date,created_at timestamptz` | Authenticated SELECT only |
| `crypto_wallet_movements` | **Created, 0 rows** | `id bigint identity,user_id uuid,movement_date date,created_at timestamptz` | Authenticated SELECT only |

These column names are **startup-read minimums, NOT full production-compatible table specifications**. Do not assert full APP acceptance merely because three empty placeholders can satisfy a startup query. Inspect write paths, report/account coupling and required constraints before provisioning a full integration environment.

## 3. Permission boundary followed for this approved migration

The executed **Staging-only** migration was `app_v117_staging_empty_owner_read_boot_tables_20261104`; its preconditions and constraints were:
1. Target only project `ldivswlhtgmznzwhzsoi`. Abort if either existing finance prerequisite is absent or any of the three requested tables already exists.
2. Use the reviewed Supabase DDL migration action to create exactly **three empty tables**, without touching N10 or Production records.
3. Each table has an `id` identity primary key, a non-null `user_id` foreign key to `auth.users(id)`, required date order column and `created_at`. RLS enabled.
4. Revoke all table/sequence rights from `PUBLIC`, `anon`, `authenticated` before granting `SELECT` on each table only to `authenticated`. Each table has exactly one owner RLS policy `USING ((select auth.uid()) = user_id)`.
5. Actual investment/wallet **write** testing requires separate explicit approval for full column contracts and INSERT/UPDATE/DELETE grants/policies; this migration does **not** grant those.
6. After creation and security verification, extend the **local test package** CSP with exactly these three additional `/rest/v1/...` routes. Keep Production, N10 Edge functions and other business endpoints blocked. No live preview was deployed.
7. Verify all five finance tables contain **zero rows**; 20 public tables now exist (15 N10 + 5 APP); all five have RLS. The new policies each require owner UUID. Actual authenticated A/B REST verification for the three new tables remains pending.
8. Recheck latest `main`, Draft PR #85 overlap and CI after updating isolated test code. Still require **separate explicit user approval** for any deployment or Production merge.

## 4. Executed migration and postflight (2026-11-04)

- Preflight: Auth-Staging project identified as **MMHVAULT-Auth-Staging**; 17 pre-existing public tables; two existing finance tables both zero rows and owner RLS enabled.
- The authorized `apply_migration` call succeeded with **three new empty tables only**.
- Postflight: exactly **20 public tables**, including the same 15 N10 tables and five owner-scoped finance tables, all five still zero rows and RLS enabled.
- RLS audit: exactly one authenticated owner-SELECT policy for each newly created table. `has_table_privilege` verified authenticated SELECT = true, anon SELECT = false, authenticated INSERT = false on each new table.
- Security advisor: no advisory findings against new tables; existing N10-related INFO notices and an Auth leaked-password-protection WARN existed before this migration and are outside APP scope.
- Isolated local Staging preview CSP updated to permit the five finance REST paths while blocking Production and N10 endpoints. **No hosted deployment, signed full-APP session or real investment/wallet test write has been performed**.

**Gate:** The user-approved empty-schema prerequisite is complete. The next stage is isolated signed full-APP boot/readback and owner-isolation QA. Full investment/wallet write capabilities, extra tables/services or any Production release must not be inferred from this approval. Keep PR #87 Draft / NO MERGE.
