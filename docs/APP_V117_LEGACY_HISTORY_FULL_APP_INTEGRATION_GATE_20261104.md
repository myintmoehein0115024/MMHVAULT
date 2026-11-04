# APP V11.7 — legacy data preservation and full-APP integration gate
Date: 2026-11-04. Branch-only P1/P2 design and code review; **NO PRODUCTION RELEASE**.

## Starting evidence
- The independent signed A/B Auth-Staging Manage/Archive QA has passed, and its two finance test tables were confirmed empty after cleanup.
- The current branch remains Draft PR #87. PR #85 cannot be merged wholesale: it would reactivate the competing V12 field manager and change the older edit policy.
- Current full `app.html` boots through `loadAll()`, which hard-requires additional investments/wallet/custom-investment data paths. The approved Auth-Staging schema has only `transactions` and `personal_configuration`. The "Protecting your private data" overlay is the correct fail-closed result of an incomplete environment, **not** a reason to turn off owner/session guards.
- Current branch review against `main` found concurrent changes in Landing/public and Analytics files, not this P1 model path. Recheck immediately before any merge.

## P1 — old account: release assertions
1. Opening Manage must not persist, reseed, rename, recategorize or delete ANY historical financial row. Archived labels and prior V12 display aliases must remain visible in history, but unavailable in new Add if archived.
2. All new/legacy owners use the same V11.7 Type → Transaction → Category controller; never load V12 and V11.7 field managers at the same time.
3. Referenced Type/Transaction/Category choices are Archive/Restore only. This includes history with old Category casing/whitespace variants; partial/malformed rows cannot be proof that a choice is unused.
4. Archive/Restore only changes owner-scoped config. Transaction IDs, date, ledger type, amount, account, currency and canonical category remain bit-for-bit unchanged. Dashboard, Analyze, Reports should read the original immutable ledger rows.
5. Missing or conflicting owner, not-yet-loaded history, or conflicting cross-device links must block destructive edits and new transaction save. An already inserted ledger row must never be reinserted just to retry its Manage sidecar.
6. Compare a **read-only** old-owner ledger snapshot before and after Manage/Archive; check row count, IDs, canonical fields and per-account totals. Do not test using real customer history as a writable fixture.

### New branch-only regression
`tests/app-v117-legacy-history-immutability.test.mjs` tests a synthetic prior-account graph with old aliases and archived categories. It proves case-insensitive legacy Category usage locks Edit/Delete, incomplete historical rows fail closed, and Archive leaves old ledger and saved record-ID links unmodified.

## P2 — complete APP: integration acceptance architecture
**Do not declare the current two-table standalone QA page to be the full APP.**

**Stage A (within existing approval; no new tables):**
- Keep the direct HTTPS core-only QA page for targeted Manage/Archive + real signed A/B work, with owner-only record/link readback and precise cleanup.
- Keep unit/Chrome/WebKit fixtures and read-only boot dependency inventory; verify the real `app.html` guard remains active.
- On Draft PR #87, inspect each startup dependency and produce the *minimal* list of required Staging tables/columns, RLS, and external services. Distinguish hard boot prerequisites from optional features, and from writes never required by QA.
- No synthetic success message or mocked full-APP release claim.

**Stage B (requires a separate explicit owner authorization):**
- Only after reviewing the minimal schema and its RLS, provision additional **empty** dedicated Staging tables as needed, with synthetic identities; do not copy Production customer data or touch N10 schemas.
- Deploy a separate non-indexed Staging full-APP preview on an isolated URL using only approved Staging endpoints, with strict host/path CSP, no Production keys, and no auth bypass.
- Test first-load guard, native Add, saved ledger ID + cloud sidecar readback, old-owner seeded synthetic history, Archive, dashboard/analyze/reports, multi-tab collisions, Safari/iOS and Android.
- After exact-marker cleanup, verify zero residual finance rows, policy/table counts, secrets boundary and unrelated services unchanged.

## STOP / release blockers
- Missing boot tables, missing RLS, owner mismatch, incomplete history, ambiguous sync, unverified sidecar, failed CI, or old-account history/report differences.
- PR #85 overlap not resolved, latest main drift not checked, or absent separate Production merge approval.
- No change here to N10 Auth, Landing, Production SQL, Production RLS, production financial records or live routes.

**Current disposition:** core Manage QA accepted; full-APP signed integration and physical-device acceptance remain **PENDING**. Keep PR #87 Draft.

## 2026-11-04 read-only source inventory — head `a6c883c7`
GitHub Actions ran `node tests/app-v117-full-app-dependency-inventory.cjs` against the full branch `app.html`, without Supabase, user credentials, API requests or table writes. It found **12 distinct literal Supabase `.from('table')` references** in the whole APP:

| Literal table referenced in APP source | Under existing two-table Auth-Staging approval? | First matching source line |
| --- | --- | ---: |
| `transactions` | Yes | 11948 |
| `personal_configuration` | Yes | 22652 |
| `investments` | No | 11949 |
| `custom_investments` | No | 11950 |
| `investment_catalogs` | No | 11757 |
| `exchange_rates` | No | 14390 |
| `recurring_transactions` | No | 13299 |
| `budgets` | No | 13356 |
| `financial_goals` | No | 24501 |
| `personal_financial_alerts` | No | 23130 |
| `personal_push_subscriptions` | No | 22765 |
| `customer_profiles` | No | 14115 |

**Interpretation limits:** these are literal `.from(...)` sites across the whole source, not the set of hard `loadAll()` dependencies. Dynamic table names and wallet movement services are not resolved by this regex; no claim is made that all ten additional tables must be provisioned. An earlier inspected full-APP boot path identified `investments`, wallet movement loading and `custom_investments` failures as hard stops, and `exchange_rates` as attempted. That failure analysis must be rechecked against latest source before making a *minimal*, owner-approved isolated schema proposal. `customer_profiles` and other existing N10 dependencies MUST NOT be provisioned or touched just because their name appears in source.

**Current action:** preserve the existing signed A/B two-table core acceptance and full-APP security overlay; gather source-specific hard-boot read paths next. No new Staging tables, Production calls or live full-APP deployment were authorized or performed.

## 2026-11-04 verified `loadAll()` hard-gate and smallest additive schema candidates

The actual full APP startup function (current draft `app.html` near line **14374**) was inspected with the read-only CI scanner:

| Service read in `Promise.all` | Resolved source | Startup handling | In approved Staging schema? |
| --- | --- | --- | --- |
| Ledger | `transactions` via `mmhPersonalReadAllV191` | **Hard failure** | Yes |
| Investments | `investments` via `mmhPersonalReadAllV191` | **Hard failure** | No |
| Wallet movements | `crypto_wallet_movements` via `mmhPersonalReadWalletV191` | **Hard failure** | No |
| Custom investments | `custom_investments` via `mmhPersonalReadAllV191` | **Hard failure** | No |
| Exchange rates | `exchange_rates` direct owner-filtered read | **Optional failure** (warning / missing rates) | No |

The wallet table was confirmed by the actual `mmhPersonalReadWalletV191` definition near `app.html` line **17294**, which calls `mmhPersonalReadAllV191('crypto_wallet_movements',owner)`. It is *not* listed among literal `.from('table')` matches because the shared reader accepts a variable table name.

**Minimal isolated schema candidates for a complete APP boot:** retain the two already-authorized finance tables; separately review **only** `investments`, `custom_investments`, and `crypto_wallet_movements` as new **empty owner-scoped Staging tables**. These are candidates, not an approved migration or proof that every feature can work with these three alone. The `exchange_rates` table is not required for the current startup hard-stop, but a separate exchange-rate functionality test may require it with its own approval. Budget, financial goals, alerts, subscriptions, customer profiles and N10 services are not authorized merely because the wider source references them.

**Pre-migration checks required:** independently inspect actual SELECT/INSERT/UPDATE columns, primary/foreign keys, existing local finance model expectations, RLS `auth.uid() = user_id`, authenticated-only grants, ownership-denial tests, no default seed data, cleanup, rollback, and CSP allowlist changes. **No table DDL, production SQL, N10 changes, or Cloudflare deployment in this review.**

A new CI regression check now asserts that the actual signed-owner `loadAll()` still hard-fails when those critical finance reads fail, that the wallet loader still targets the known wallet table, and that the user/session owner guard remains intact. Tests are static read-only checks; they do not simulate a successful full APP login.


## 2026-11-04 Transaction UI / ledger refresh hardening (Draft PR #87 only)

### P1 legacy Category canonical-registry drift fixed
The native APP reads both the V11.7 hierarchy choice IDs and the historical `config.categories` / `CATS` canonical registry. Previously `rename('category')` appended the new label while leaving the **unused old label** in the canonical registry; `delete('category')` removed the choice ID but could leave a ghost Category visible in legacy readers, including Analyze. The controller now updates both lists in one owner-guarded transaction, **and refuses to remove any label referenced by any historical row**, even across a different canonical group. Archive still only marks a V11.7 choice archived and never rewrites the old ledger or canonical registry. New Node regression covers rename, delete, capitalization changes, old-history protection and Archive invariance.

### Native INSERT success did not itself refresh current APP data
Read-only review of current `app.html` confirmed:
1. `addTransaction(e)` inserts a `public.transactions` row and receives its confirmed database ID, then calls the V11.7 `onLedgerInserted` sidecar callback. It does not itself call `loadAll()` afterward.
2. Its existing V321 `guardedCall(fn)` only checks offline state and awaits the function; it also does not trigger a cloud data refresh.
3. Account balances, Dashboard and Analyze depend on the owner-loaded `transactions` array and `mmhvault:data-loaded` event. Therefore, without a separate reload, a successful INSERT could leave the current screen displaying stale totals.

**Branch-only repair:** `js/mmhvault-v11-manage-hierarchy-live.mjs` now schedules an **owner-checked, read-only forced `loadAll({force:true})`** after confirmed ledger insertion and the Manage sidecar attempt. It verifies the exact saved record ID in the returned owner-scoped array; if another request returned an earlier in-flight snapshot, it makes **at most one additional read**. On failure it states **the transaction was saved** and advises a reload **without resubmitting**. When a sidecar path cannot be confirmed, the ledger still refreshes, the invalid link is not forged, and a safety notice remains. No transaction INSERT/UPDATE/DELETE is replayed or added to the hierarchy module.

**Regression:** Chrome + Linux WebKit synthetic browser QA at 393, 768 and 1440px now models one stale cloud snapshot, confirms exact owner/ID readback after a second read, confirms no duplicate config or financial record, and confirms unlinked-but-confirmed rows still refresh. It also simulates native legacy selector rebuilds to prove that the exact Type → Transaction → Category path remains selected.

### Release boundary unchanged
This is **source + simulated browser qualification**, not real signed-in full APP end-to-end acceptance. Actual Accounts / Dashboard / Analyze values and multi-device cloud verification still need isolated full-APP Staging approval, since the two-table sandbox cannot boot the whole native APP. No Staging schema change, Production finance mutation, N10/Landing/Analytics edit, PR merge or deployment occurred. Keep PR #87 DRAFT.


## 2026-11-04 follow-up — keep finance reload independent of cloud-link verification

The prior `onLedgerInserted` handler called `refreshSavedLedger()` **only after** awaiting `verifyCloudLink().finally()`. A stalled/never-settled `MMHConfigCloudSyncV122.syncNow()` could therefore stop the freshly saved `transactions` row from appearing in the in-memory ledger, leaving Accounts, Dashboard and Analyze stale despite successful INSERT.

**Branch-only fix:**
- Schedule the **signed-owner financial readback immediately and independently** of `verifyCloudLink`. Manage sidecar verification can still run or remain pending without postponing financial summaries.
- Serialize confirmed-transaction `loadAll({force:true})` refresh reads within one owner to prevent a slower old read from repainting after a faster newer read during quick consecutive saves. They never replay the INSERT, mutate history or change source ledger fields.
- On `mmhvault:config-owner-changed`, clear the queue for the old account; a stuck old-owner network promise cannot block the new account's refresh. Every continuation checks the signed-in owner and config owner, and the native `loadAll` session epoch still guards data assignment.
- New Chrome/WebKit synthetic tests at phone/tablet/desktop widths: intentionally never resolve cloud-link sync, then save two consecutive confirmed transaction IDs with one held read; verify both IDs arrive in the one-owner snapshot with no duplicate ledger write. Separate owner-switch test holds A's read indefinitely and confirms B's read starts and only B data appears.

**Security / acceptance:** The scenarios use local synthetic fixtures and disabled network, not live Staging financial writes. Existing signed two-table core QA remains valid; true full APP signed owner history / Accounts / Analyze / Dashboard results remain unverified. No DB schema/Production/N10/Landing changes or deployments; PR #87 stays DRAFT.


## 2026-11-04 — native saving / insufficient-balance guard compatibility

During PR #87 code review, V11.7 `form()` was found to assign `save.disabled=cloudConflict||!valid()` after rebuilding the user-configured Type→Transaction→Category choices. This could re-enable the **same native Save button** while either:
- the V321 native submit wrapper has `v321-submit-busy` active (financial write still running), or
- the V344 negative-balance guard has `balance-blocked` active (funds insufficient).

**Branch-only correction:** the Manage renderer now honors both independent native button locks in addition to the hierarchy path/cloud-conflict checks. Its capture-phase submit interceptor also blocks an event carrying either lock, before the native financial write handler, avoiding accidental replacement of the first INSERT's pending Manage path by a rejected duplicate submit.

**Automated regression:** Chrome and WebKit local-only synthetic browser tests at phone/tablet/desktop widths assert each lock survives a hierarchy refresh, duplicate/insufficient-funds submissions are intercepted before native submit handling, and the button re-enables when the external locks are cleared. The source-inventory CI additionally asserts both marker names and all binding guards remain present in the real full `app.html` and PR #87 hierarchy module. This is **not** a signed, full-APP real-funds test and does not authorize a Production or database migration.

Release gate unchanged: preserve the legacy ledger, full-APP Staging signed integration pending, PR #87 remains Draft.
