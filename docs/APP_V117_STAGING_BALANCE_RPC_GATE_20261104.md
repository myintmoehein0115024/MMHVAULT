# APP V11.7 Staging Expense/Transfer balance fix — approved & deployed

2026-11-04. **User explicitly approved the isolated Staging fix. Completed on Auth-Staging only; NO PRODUCTION CHANGE.**

## Verified root cause

Account A already has a correct **Ty-Expense (Expense) → Tr-Expense (Expense|Expense) → Ca-Dining (Expense)** linkage and one confirmed synthetic Income transaction (#5, +100000 USD to Daollar). B has zero transactions. The existing full native APP's `mmhvault-v175-no-negative-balance-js` capture-submit guard calls:

`db.rpc('mmh_personal_account_balance', { p_user_id, p_account_name, p_exclude_transaction_id:null, p_exclude_investment_id:null })`

for **any** positive `fromAmount`. The user screenshot shows `Balance check unavailable / TypeError: Failed to fetch`. Before this fix, the Auth-Staging database had **no** `public.mmh_personal_account_balance` RPC (verified in `pg_proc`). Before the fix, the independent Pages Staging build had a CSP limited to five finance table REST routes, **without** the RPC route. The browser may therefore fail before getting an HTTP error. This is an environment dependency failure, not evidence the user chose the wrong Expense Type. Neither blocker should be solved by removing the server balance guard.

## Approved and executed Staging-only fix (completed)

1. Before any change, verify project ID **ldivswlhtgmznzwhzsoi**, all five existing tables/owner RLS, their schema and no pre-existing RPC signature.
2. Only to that exact project, apply the reviewed script `docs/APP_V117_STAGING_BALANCE_RPC_REVIEW_ONLY.sql`. It adds **one** `SECURITY INVOKER`, owner-validated, read-only RPC `mmh_personal_account_balance`, executing under existing RLS. Only `authenticated` receives EXECUTE. It cannot access a foreign owner's balance; no production code or data is changed.
3. The RPC computes the signed owner's **native-currency** balance from previously saved transaction credits/debits, not FX. It rejects nonexistent/ambiguous accounts and **fails closed** on any investment, custom-investment, linked-investment or wallet activity, because the three existing staging placeholder tables lack full accounting columns. Production may have a different RPC: this is NOT a production migration.
4. Permit **only** `/rest/v1/rpc/mmh_personal_account_balance` in the separate Staging-only CSP builder, then run independent Chrome/WebKit network-safety CI, ensuring Production/N10/other RPCs remain blocked.
5. Real signed Staging A/B acceptance: A's Daollar with +100000 USD can debit 10000 USD and retain 90000; attempt to debit more than remaining amount must be rejected; B cannot see A's funds and cannot call A-owned balance; insufficient-funds and network failures must fail closed. Do not double-submit. Use a newly created test-specific Category for Transfer under Tr-Transfer if needed (new owner has no default Category).
6. User verifies Accounts/Dashboard/Analyze/Reports and refresh; exact-marker cleanup after sign-off. PR #87 remains Draft and requires separate production merge approval.

## Verified results (2026-11-04)
- Applied migration: `app_v117_staging_balance_rpc_owner_only_20261104` **only** to `ldivswlhtgmznzwhzsoi`.
- Verified target RPC is **SECURITY INVOKER**, executable by `authenticated` only; `anon` and `PUBLIC` cannot execute.
- Auth-Staging's five finance-table SELECT RLS policies remain `user_id = auth.uid()`; the migration created no tables or RLS policies.
- Read-only SQL tests with a simulated authenticated A JWT subject: `Daollar = 100000`, `Baht = 0`. These are **role-simulation tests**, NOT real signed browser acceptance.
- Read-only SQL tests with simulated B JWT subject: passing A's user_id is rejected, and B cannot resolve A's account under its own ID. No financial row written by these tests.
- Staging CSP builder permits the **single** exact `/rest/v1/rpc/mmh_personal_account_balance` path. Chrome browser smoke verifies this is reachable while unrelated RPCs, N10 Edge and Production are blocked. WebKit/Chrome synthetic checks and other APP V11 CI passed at `164e6f3ba9f863aaaa8b4bb1027c0fb77ac01191`.
- Cloudflare independent Staging build deployed successfully at `164e6f3ba9f863aaaa8b4bb1027c0fb77ac01191`.
- No confirmed user-entered Expense / Transfer after this repair yet. **Real signed A/B**, Accounts, Dashboard, Analyze, Reports, refresh, overspend and account isolation still require live acceptance.
- **Do not rerun** the SQL migration: it deliberately fails if the RPC already exists. Keep PR #87 Draft until separate Production authorization.

## Hard restrictions

- Do not create/modify any other table, RLS policy, N10 object, Production function/schema, Production ledger or deployed N10/Landing/Analytics service.
- Do not add a public broad REST or RPC CSP wildcard.
- Do not disable the V175 guard or use a stale client-side balance as a substitute for live authenticated verification.
- RPC is a synthetic **Staging-only** acceptance aid; it is not the long-term production concurrency control. Production financial overdraft protection needs an independent server-atomic review.
- No API, credential, password or auth session captured in CI.
- Only the explicitly approved Auth-Staging RPC and isolated Staging CSP have been changed. **Do not** deploy these Staging-only changes to Production; production rollout requires separate authorization and concurrency review.
