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

## Failure-aware UI and synthetic Chrome QA — follow-up

- A confirmed ledger insert with a **failed local config sidecar write** now
  stays in an explicit **Needs link** state. The user may choose **Retry link**,
  which calls only the existing owner-scoped hierarchy config adapter; it
  never repeats, edits or deletes the saved financial transaction. If the
  retried config write succeeds, status becomes Pending cloud verification,
  never automatically Verified. If owner/session changed, retry is refused.
- Pending cloud verification is isolated in the pure read-only
  `js/mmhvault-v11-manage-hierarchy-sync.mjs` adapter, with synthetic tests
  for offline/busy sync, missing/stale/forged cloud sidecars, wrong owner,
  race-condition owner switch during both async waits, and readback failure.
- Existing cloud sidecar verification checks actual Type → Transaction →
  Category parent references and canonical ledger group/type. A later saved
  transaction arriving during an earlier check is queued for one validation
  attempt; failed checks do not loop indefinitely.
- Added **local synthetic Chrome UI QA**, no production/staging Auth, no DB:
  393px phone, 768px tablet and 1440px desktop; three empty new-owner Manage
  cards, order/type parent prerequisites, Add Transaction cascade, archive,
  keyboard Escape and focus return, EN/ZH/MY switching, modal viewport bounds,
  older-owner display and zero-migration-on-view, and failed sidecar write
  followed by a sidecar-only user retry. This is browser QA but **not real
  authenticated Staging QA** and does not prove WebKit, iOS or Android.

## WebKit / Safari-engine simulated responsive acceptance (draft only)

Independent WebKit automation was added to the existing synthetic Chrome QA
suite. The WebKit run uses local no-auth browser fixtures with touch/mobile
emulation at **393px**, tablet/touch at **768px**, and desktop at **1440px**.
It checks linked Manage controls, archive, history-compatible old accounts,
failed-sidecar retry without duplicate ledger insert, keyboard focus/escape,
EN/ZH/MY and cross-owner hiding. The Chrome suite runs unchanged as its
own job. Final tested code head `d7a4a0c3378ce4886928e059807b03b9c55d74d6`:
**5/5 GitHub workflow runs successful**, with **3/3 hierarchy jobs**
(model, Chrome, WebKit) successful, **7 passing CI jobs total**.

**Important:** Linux WebKit automation is not physical iPhone Safari, an
Android browser, or authenticated Staging. No Production user session,
cloud credential, Supabase schema, RLS or financial row was accessed.
Before release, run real owner-scoped Staging A/B acceptance and actual
Safari/iOS/Android checks. Current main-only drift consists of Landing
`index.html` and three `landing-assets/` files; Draft PR #85 still overlaps
APP paths and must not be merged blindly.

## Multi-device immutable link overwrite prevention (draft follow-up)

The existing `personal_configuration` cloud sync uses timestamp ordering and
compare-and-swap. Timestamps alone are insufficient for **two independently
saved immutable transaction→Manage sidecars**. Before an upload or download,
the V11.7 candidate now compares the owner-scoped transaction-record ID links
from the local and remote JSON configurations.

- If all remote IDs are already present locally, a newer local config can
  upload; if all local IDs are present remotely, a newer cloud config can
  download. Record IDs shared by both must have **identical Type, Transaction,
  Category IDs and canonical ledger type/group/category**.
- If either copy has missing links that the other would erase, or the same
  record ID has different meanings, **sync is blocked rather than overwriting**.
  An equal timestamp with different links also fails closed. Foreign-owner or
  malformed hierarchy payloads fail closed.
- A matching-owner `mmhvault:config-link-sync-blocked` event displays an
  accessible EN/ZH/MY warning, closes a current Manage editor, and temporarily
  blocks Manage mutations and Add Transaction saves. Owner changes reset the
  warning. **A conflict is NOT automatically reconciled**: safe multi-device
  merges still require independent authenticated Staging review. Never create
  a duplicate transaction to resolve an unverified Manage association.
- Synthetic regression directly executes the actual `app.html` cloud-sync
  inline script in two isolated Node VM device contexts with a fake shared
  configuration row. It covers older/newer timestamps, force-upload,
  divergent IDs, same-ID tampering, remote/local superset, equal timestamps,
  wrong owner and malformed payload; it accesses **no real database**.
- The isolated Chrome and Linux WebKit (393 / 768 / 1440px) fixture now also
  tests the visible conflict warning, pause of unsafe writes, archived
  selections and owner switch. These checks do not establish physical device
  or real Staging acceptance.

Last validated code head:
`3ab35b9bad0f8c887c28f1e0236ab12c40dc3a0f`.
**All five GitHub Actions workflows completed successfully; three hierarchy
jobs (Node safety, Chrome, WebKit) and four other finance/APP jobs passed
(7 total).** Never merge without reconciling overlapping Draft PR #85 and
refreshing the latest main.

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
