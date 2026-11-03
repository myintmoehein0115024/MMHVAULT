# APP V11.7 — linked Manage staging candidate (NO DEPLOY)

## Contract

Both new and existing accounts use Type → Transaction → Category.
A new owner has **zero configured Manage items**. Transaction cannot be
created until a Type exists, and Category cannot be created without a
Transaction. Add Transaction cascades based on the selected parent.

A Type retains a canonical financial meaning (Income, Expense or Transfer).
A Transaction maps to a compatible canonical accounting group. Category
labels are linked under each Transaction, but original financial row
columns remain unchanged. System-managed Transfer and Data Adjustment
categories use their fixed ledger labels.

**Used node:** no edit/delete; only archive/restore. If an old ledger row
does not carry a historical Manage choice ID or transaction_group, use
conservative matching and refuse destructive edits. Archiving hides new
choices but does not rewrite the transaction ledger, balances or reports.

## Implementation in Draft PR #87

- `js/mmhvault-v11-manage-hierarchy-model.mjs`: model, ownership,
  parent references, archive, legacy aliases and history detection,
  verified record-ID sidecar.
- `js/mmhvault-v11-manage-hierarchy-controller.mjs`: guarded config
  mutations with in-memory rollback, canonical category registry,
  history-readiness checks and post-insert link recording.
- `js/mmhvault-v11-manage-hierarchy-live.mjs`: EN/ZH/MY glass Manage,
  three linked native selectors, archive/restore and owner-change guard.
- `app.html`: branch-only module loader; owner-scoped hierarchy
  normalization inside existing personal configuration JSON; post-insert
  confirmed transaction ID hook. No Supabase schema/table/RLS changes,
  and no mutation to old historical financial rows.
- Two test suites plus `app-v11-hierarchy-review.yml` CI.
  Latest core pure-logic review: **25/25**. Latest head Actions:
  **5/5 workflows SUCCESS**, including finance data-link, account
  balance, photo, prior V11 layout and new hierarchy safety checks.

## Operational caveats — must pass before live release

1. Real authenticated **Staging** dual-owner test: fresh account empty,
   create Income → Income2 → Salary; restart, refresh, cloud sync and
   secondary device. Confirm no ghost categories from old defaults.
2. Legacy test accounts with historic transaction data, old alias labels,
   archived loan/personal categories and old V12 preferences. No
   accidental data migration or altered Analyze/Account balances.
3. Confirmed DB insert and corresponding config-sidecar record ID must
   survive slow network, concurrent tabs, failed config cloud upload,
   session switch and readback. The financial transaction save is NOT
   atomic with the config-sidecar write. If linkage fails, retain the
   financial record and fall back to conservative historical locking.
   Never present it as fully synchronized.
4. Real browser/mobile QA (Chrome, Safari/WebKit, iOS/Android, light/dark,
   393/768/1440 viewports). Dialog focus-trapping, keyboard, empty
   selector/submit block and native form cascade re-renders need testing.
5. Confirm category names do not conflict across canonical Income/Loan
   or Expense/Personal/Loan families and that account/report calculations
   are unchanged.
6. Review outstanding Draft PR #85 separately; its V11.6 logic cannot
   be bulk-merged over V11.7. Refresh latest main and conflicts.
7. Obtain explicit owner approval for merge/deployment only after the
   above acceptance gates succeed.

**Current state:** connected code exists on a *draft branch* and is not
yet production-qualified. No GitHub merge or Production deployment has
been performed.
