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

## Post-insert usage lock hardening (draft follow-up)

A confirmed ledger record's owner-scoped JSON sidecar now immediately marks its
Type, Transaction and Category as **used**, even before the refreshed history
query includes the row. Edit/Delete remain blocked, while Archive and the
original ledger record/link stay unchanged. Controller/model synthetic regression
cases assert all three fields are locked in this post-insert gap.

This only fixes the **confirmed-and-saved-sidecar** gap. A failed/offline/cloud-
queued sidecar upload, competing tab, or cross-device readback still needs real
Staging/browser tests; it is not a claim of atomic ledger/config persistence.

## Linked glass modal usability (draft follow-up)

The three Manage cards remain visible for both new and legacy accounts. A new
owner's Transaction Add action stays disabled until an active Type is present;
Category Add stays disabled until an active linked Transaction is present.
The modal explains the prerequisite in EN/ZH/MY. The dialog now keeps keyboard
Tab focus inside, supports Escape close, returns focus to the originating card,
prevents background scroll, and keeps an accessible title in editor/confirm views.
These are implementation-level checks, not a completed Safari/mobile acceptance.

## Last transaction cloud readback (draft follow-up)

The UI now distinguishes a confirmed ledger insert from an owner-scoped
Manage link verified in cloud configuration. It schedules an immediate
sync check through the existing MMHConfigCloudSyncV122.syncNow(false) API and
performs a read-only personal_configuration owner-filtered readback of the
exact record ID, canonical ledger values and three Manage IDs. If the queue is
busy, cloud is unavailable or data disagrees, the UI stays Pending and
provides a manual Recheck sync action in Manage. It never displays
cloud verified from local state alone. On owner switch the status is cleared.
No remote row is modified by the verification query. Duplicate callbacks for
the same existing link are idempotent, while an attempt to rebind an existing
record ID to a different path is rejected. Model/controller tests cover these
invariants. This is not an atomic DB transaction or signed Staging A/B proof.

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
