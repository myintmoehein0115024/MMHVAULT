# APP V11 — Hierarchical Manage contract (2026-11-03)

**Scope:** isolated draft foundation only; not linked by `app.html`, not in production.

## Confirmed behavior

- All *new* accounts start with empty **Type**, **Transaction**, **Category** choices. Nothing from preset/default categories is placed into their Manage lists.
- Type is the required parent for Transaction; Transaction is the required parent for Category.
- Add Transaction must render all three linked selectors, and only show transactions for the selected Type and categories for the selected Transaction.
- Names such as `Type: Income → Transaction: Income2 → Category: Salary` are display options. The ledger continues to save existing canonical Income/Expense/Transfer and compatible group/category values.
- Same glass-modal UI for new and existing accounts. Existing account configuration is **derived read-only** until an explicitly authorized owner-scoped migration, and must not rewrite financial history.
- If a Manage node is referenced by a saved transaction: **no Edit or Delete**, only **Archive/Restore**. Archived choices disappear from new-entry selectors but historical values, reports, balances and cloud records remain intact.
- When old ledger records have no stable choice ID, use canonical-code matching conservatively to lock editing. While transaction history is loading, **no Edit/Delete** is permitted.
- Archive Type hides its Transaction/Category descendants; archive Transaction hides its Categories; restore shows descendants that were not separately archived.
- Cross-owner data is never presented or mutated; no change to N10, Landing, Auth, RLS or Supabase schema.

## Status

`js/mmhvault-v11-manage-hierarchy-model.mjs` contains isolated pure data rules.
`tests/app-v11-manage-hierarchy-model.test.mjs` verifies blank onboarding, strict parents, cascading, usage guards, archive/restore, legacy derived view and cross-owner isolation.

### Remaining integration — mandatory before any merge

1. Read the **latest main** and existing Draft PR #85. Rebase or deliberately supersede conflicting V11.6 Type/Transaction edits; never bulk-merge both.
2. Adapt `MMHV11TxFieldPrefs` / Manage glass modal to this model. Keep existing category business validation, the original three-column native ledger form, and owner-scoped persistence. No browser-default alerts.
3. Save a stable `choiceIds` tuple with **future** transactions only after validating the existing transaction-save schema, preserving canonical accounting fields; historical rows are never backfilled destructively.
4. Add an explicit, idempotent, non-destructive migration for older owners. Preserve `txFieldsV12`, `displayV13`, `categories`, `archivedCategories`; require read-only checks of linked historical records before allowing edit/delete.
5. Implement atomic owner-consistent category persistence and rollback on failure. Category must point to a Transaction and continue working in accounting reports.
6. Run integration, browser, mobile/desktop responsive, old/new dual-owner, archive/history, FX and report regressions; review latest main conflicts and CI.
7. Obtain separate explicit approval before GitHub merge or production deployment.

**Do not call this PR finished UI functionality or production-ready.** It is a tested contract for the safer integration phase.
