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
