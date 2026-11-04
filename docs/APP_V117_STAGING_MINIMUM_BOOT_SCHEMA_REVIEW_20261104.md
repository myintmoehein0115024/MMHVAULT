# MMHVAULT APP V11.7 — minimum full-APP Staging boot schema REVIEW ONLY

Date: 2026-11-04. Status: **planning only, NOT APPROVED to create any additional table**.
Production project: explicitly OUT OF SCOPE. Auth-Staging: `ldivswlhtgmznzwhzsoi` only.
This file is not a migration or a runbook to apply without a separate user authorization.

## 1. Verified read-only Auth-Staging preflight

The connected read-only Supabase table inventory reports **17** existing public tables, of which **15** are existing N10 QA tables and **two** are the approved APP V11.7 finance sandbox tables:
- `public.transactions`: zero rows, RLS enabled; owner UUID foreign-key to `auth.users`; primary key `id`.
- `public.personal_configuration`: zero rows, RLS enabled; owner UUID primary/foreign key, `config jsonb`.
- The two financial tables have eight owner-scoped RLS policies in total (SELECT / INSERT / UPDATE / DELETE for each), checked from read-only `pg_policies`.
- Neither a new table nor a Production record was created or modified by this review.

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
| `investments` | **Absent** | `id,user_id,inv_date` (data shape for nonempty records still needs review) | **Separate approval required** |
| `custom_investments` | **Absent** | `id,user_id,inv_date` (data shape for nonempty records still needs review) | **Separate approval required** |
| `crypto_wallet_movements` | **Absent** | `id,user_id,movement_date,created_at` (nonempty movement fields still need review) | **Separate approval required** |

These column names are **startup-read minimums, NOT full production-compatible table specifications**. Do not assert full APP acceptance merely because three empty placeholders can satisfy a startup query. Inspect write paths, report/account coupling and required constraints before provisioning a full integration environment.

## 3. Exact permission boundary for any future proposal

Any future authorized extension must:
1. Confirm the project ID is exactly the Auth-Staging project before execution. Abort if any target table exists or any schema drift is detected.
2. Use a transaction-bound, reviewed migration with exactly three **empty** owner-scoped tables; do not import Production records, add default financial rows or modify N10.
3. Create owner UUID foreign keys and stable primary keys as required by the audited APP model. Enable RLS before granting Data API access.
4. Keep `anon` / `PUBLIC` privileges revoked. For initial **boot-only** evaluation, prefer `SELECT` only for authenticated users with `USING ((select auth.uid()) = user_id)`; do not silently grant write access.
5. If future testing actually needs investment/wallet writes, request **specific additional authorization** for required columns, INSERT/UPDATE/DELETE policies, and cleanup.
6. Extend the strict test-preview CSP by exactly those approved three `/rest/v1/...` routes only **after** DB/RLS approval. Keep Production domains, N10 Edge functions, other services and service workers blocked.
7. Verify signed synthetic A/B separation and owner-only readback; check each test table and previous two financial tables return to zero records; confirm 15 N10 tables and their policies unchanged.
8. Recheck current `main`, PR #85 overlap and all GitHub CI, then seek a **different, explicit authorization** before any Production merge/deployment.

## 4. What was done now

- New code assertions verify full APP owner-filtered `select('*')`, ordering and session-guard behavior.
- Test-only browser smoke confirms the **currently unapproved** three REST routes remain blocked by Staging preview CSP.
- Existing signed A/B two-table Manage/Archive QA remains accepted and is not rerun.
- **No DDL was executed. No Staging or Production deployment was performed.**

**Gate:** P1 old-account synthetic compatibility remains under verification; P2 full APP authenticated integration is blocked until the three-table schema proposal is explicitly approved and tested. Keep PR #87 Draft / NO MERGE.
