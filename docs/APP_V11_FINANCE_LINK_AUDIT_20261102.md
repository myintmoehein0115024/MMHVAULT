# APP V11 · Account connection baseline (2026-11-02)

## Scope
APP-only verification of Accounts → Transactions → Dashboard/Analyze/Reports.
No changes to app.html, N10, Landing, Business, database tables, RLS,
production auth, financial records, or production deployment.

## Verified production schema and counts (read-only)
- main reviewed: 59f7acb04c69471c91c4678497c3972d46ce7cd0.
- public.transactions links via from_account/to_account TEXT (not account FK).
- public.personal_configuration.config contains per-user accounts JSON.
- 217 populated transaction-account references were checked; 216 matched
  the same user's cloud account name and 1 did not.
- The unmatched reference belonged to one custom/legacy (not built-in)
  account name. Do not infer its currency or recreate it automatically.
- No duplicate account names (case-insensitive) found in cloud config.
- No Baht/Bath account stored with a currency other than THB.
- The cloud config currently has no AMD account; that does not imply the
  APP's AMD support is broken or that a new account failed on a particular
  local device. Existing client FX reference tests already cover AMD.
- Account logo/photo/notes/visibility are stored in browser-local visuals;
  cloud-config's accounts objects currently omit these fields. Cross-device
  persistence needs an isolated design and security review.

## Code findings
- Existing MMHVAULT_CONFIG account objects hold stable account IDs, but
  transaction records store account display names. Renames update references
  in several tables; this is a data-integrity risk if any step fails.
- Existing builtin Baht recovery uses verified acc_bath metadata.
- The accountMeta fallback for unrecognized names currently uses MMK;
  this must NOT be used to guess a historical custom account's currency.
  Production behavior is unchanged by this review-only PR.
- Existing cloud config uses updated_at compare-and-swap, but visuals
  are not part of that config. Never upload arbitrary base64 images into
  personal_configuration without size, permissions and conflict review.

## New dev-only protection
- Pure owner-scoped, read-only audit module; excludes cross-user rows.
- Unit tests for orphan references, preserved Baht alias, archived history,
  custom AMD FX, duplicate names, and mutation-free execution.
- **2026-11-03 extension:** a reference matching multiple account records,
  including a built-in `Baht` / custom `Bath` collision, is now flagged as
  ambiguous. It is never assigned a currency based on account list order.
- The protected `acc_bath` identity is checked against **THB**; conflicting
  stored currency is flagged for review without touching any record.
- Archived non-core currency accounts referenced by historical records also
  require a verified FX reference; inactivity does not mean a rate is safe.
- Aggregated read-only SQL preflight with no account names or user IDs.
- Isolated GitHub CI for APP V11 audit tests.

This branch changes the **developer audit only**, not the live account manager.
The 217/216/1 figures above are the **2026-11-02 snapshot**, not a fresh
production recount. No affected accounts or transactions have been repaired.

## Next candidate (requires separate review and tests)
1. Prevent unknown account currencies from being silently shown as MMK.
2. Protect multi-table account rename from partial updates.
3. Persist account visuals securely across devices.
4. Test multi-currency totals and explicit missing-FX UI alerts.

Nothing in this PR repairs or edits the unmatched live reference. A safe fix
requires confirming the original account metadata and owner first.
