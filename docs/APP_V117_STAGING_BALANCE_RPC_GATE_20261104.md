# APP V11.7 Staging expense/transfer blocked — owner-approval release gate

2026-11-04. **DRAFT / NO DATABASE OR PRODUCTION CHANGE.**

## Verified root cause

Account A already has a correct **Ty-Expense (Expense) → Tr-Expense (Expense|Expense) → Ca-Dining (Expense)** linkage and one confirmed synthetic Income transaction (#5, +100000 USD to Daollar). B has zero transactions. The existing full native APP's `mmhvault-v175-no-negative-balance-js` capture-submit guard calls:

`db.rpc('mmh_personal_account_balance', { p_user_id, p_account_name, p_exclude_transaction_id:null, p_exclude_investment_id:null })`

for **any** positive `fromAmount`. The user screenshot shows `Balance check unavailable / TypeError: Failed to fetch`. The Auth-Staging database has **no** `public.mmh_personal_account_balance` RPC (verified in `pg_proc`). The independent Pages Staging build currently has a CSP limited to five finance table REST routes, **without** the RPC route. The browser may therefore fail before getting an HTTP error. This is an environment dependency failure, not evidence the user chose the wrong Expense Type. Neither blocker should be solved by removing the server balance guard.

## Proposed narrowly scoped fix (REQUIRES NEW EXPLICIT APPROVAL)

1. Before any change, verify project ID **ldivswlhtgmznzwhzsoi**, all five existing tables/owner RLS, their schema and no pre-existing RPC signature.
2. Only to that exact project, apply the reviewed script `docs/APP_V117_STAGING_BALANCE_RPC_REVIEW_ONLY.sql`. It adds **one** `SECURITY INVOKER`, owner-validated, read-only RPC `mmh_personal_account_balance`, executing under existing RLS. Only `authenticated` receives EXECUTE. It cannot access a foreign owner's balance; no production code or data is changed.
3. The RPC computes the signed owner's **native-currency** balance from previously saved transaction credits/debits, not FX. It rejects nonexistent/ambiguous accounts and **fails closed** on any investment, custom-investment, linked-investment or wallet activity, because the three existing staging placeholder tables lack full accounting columns. Production may have a different RPC: this is NOT a production migration.
4. Permit **only** `/rest/v1/rpc/mmh_personal_account_balance` in the separate Staging-only CSP builder, then run independent Chrome/WebKit network-safety CI, ensuring Production/N10/other RPCs remain blocked.
5. Real signed Staging A/B acceptance: A's Daollar with +100000 USD can debit 10000 USD and retain 90000; attempt to debit more than remaining amount must be rejected; B cannot see A's funds and cannot call A-owned balance; insufficient-funds and network failures must fail closed. Do not double-submit. Use a newly created test-specific Category for Transfer under Tr-Transfer if needed (new owner has no default Category).
6. User verifies Accounts/Dashboard/Analyze/Reports and refresh; exact-marker cleanup after sign-off. PR #87 remains Draft and requires separate production merge approval.

## Hard restrictions

- Do not create/modify any other table, RLS policy, N10 object, Production function/schema, Production ledger or deployed N10/Landing/Analytics service.
- Do not add a public broad REST or RPC CSP wildcard.
- Do not disable the V175 guard or use a stale client-side balance as a substitute for live authenticated verification.
- RPC is a synthetic **Staging-only** acceptance aid; it is not the long-term production concurrency control. Production financial overdraft protection needs an independent server-atomic review.
- No API, credential, password or auth session captured in CI.
- This commit is **review only**. Neither SQL nor CSP permission is applied without further owner approval.
