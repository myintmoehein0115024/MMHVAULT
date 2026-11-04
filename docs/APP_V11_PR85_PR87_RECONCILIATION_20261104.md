# APP V11.7 — PR #85 versus PR #87 reconciliation (2026-11-04)

**Status:** comparison and isolation complete; this is NOT a merge approval.

## Scope and facts verified from GitHub

PR #85 (Draft APP V11.6) modifies:
- `app.html` only to load the older transaction-field layout addon at
  `v=3.0.5`, replacing `v=3.0.4`;
- `js/mmhvault-transaction-field-layout-v11.js`;
- `js/mmhvault-v11-manage-glass-dialogs.js`;
- two tests of those older modules.

PR #87 (Draft APP V11.7) provides a **separate single new controller**:
`js/mmhvault-v11-manage-hierarchy-model.mjs`,
`js/mmhvault-v11-manage-hierarchy-controller.mjs` and
`js/mmhvault-v11-manage-hierarchy-live.mjs`, plus its own immutable
record-sidecar sync and Chrome/WebKit tests. In PR #87's `app.html`,
**the older `mmhvault-transaction-field-layout-v11.js` is not loaded**;
the new hierarchy module is loaded at `v=0.7.0`. The old addon code remains
in Git as a rollback/reference source, but is not an active second manager.

## Decisions

1. **Do not merge PR #85 wholesale into PR #87.**
   Loading both field managers would create competing Type/Transaction/
   Category selectors. It could overwrite Add Transaction choices and
   render mismatched hierarchy state after account switching.
2. **Retain the PR #85 owner-safety intent**, not the old implementation:
   PR #87's controller explicitly requires matching signed-in
   `currentOwner()` and `configOwner()`, complete owner-only history,
   and normalized persisted owner-scoped graph. Account switch clears
   choice IDs, pending saves, current link verifications and modal state.
   The dedicated JS/Chrome/WebKit tests cover these guards.
3. **Retain the PR #85 new-user empty-state intent**, not copied default
   Category seeds: PR #87 starts new owners with an empty Type, Transaction,
   Category hierarchy. Category requires a matching Transaction, which
   requires Type. No Salary/Dining items appear automatically.
4. **Improve old-user editing protection beyond PR #85.** PR #85 permits
   renaming certain old legacy options after explicit pref migration. PR
   #87's owner requirement is stricter: **any entry referenced by ledger
   records cannot be edited/deleted, only archived**, with historical
   transaction fields and stable saved record IDs unchanged. Unknown /
   still-loading history also blocks destructive edits.
5. **Keep old-account ledger data unchanged.** PR #87 derives the legacy
   hierarchy in memory from existing categories and existing V12 aliases;
   simply opening Manage must not write or reclassify historical entries.
   The first explicit owner-approved change is saved as an owner-scoped
   candidate graph without modifying `public.transactions`.
6. **Avoid cherry-picking PR #85 tests** into PR #87. The former assert
   old V12 script version and legacy edit behavior that intentionally
   differs. Use the new V11.7 controller, cloud, browser, account/history,
   and finance regression checks instead.

## Required release gates

- Run the full APP V11.7 local preview against *only* the authorized
  Auth-Staging `transactions` + `personal_configuration` test tables.
  The local build has CSP path allowlist for session auth + these tables
  only, and the copied scripts have no hardcoded Production URL/key.
- Validate an actual old-account dataset and cross-device saved state,
  avoiding automatic alteration of production records.
- Confirm any legacy option reused by a historical transaction is
  Archive-only and hidden in future Add while history remains immutable.
- Confirm no `mmhvault-transaction-field-layout-v11.js` script loads
  alongside the V11.7 module, including after latest-main rebase.
- Before final release, re-check current `main`, run every CI workflow,
  review conflicts, and obtain separate Production merge approval.

The user-approved Staging A/B signed API QA **passed**; it is not the
same thing as full historical APP integration or physical iOS/Android QA.
PR #85 remains Draft and independently unmerged pending disposition.
