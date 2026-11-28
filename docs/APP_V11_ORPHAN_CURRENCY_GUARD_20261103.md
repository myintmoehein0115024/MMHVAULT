# APP V11 — Unknown historical account currency safety review (2026-11-03)

## Why
The previous `mmhVaultAccountMeta(name)` returned MMK for every historical
account that had no matching account configuration. USD/THB/MMK dashboards
could therefore include fabricated conversion amounts instead of flagging
missing account metadata. This is especially risky for deleted or renamed
custom accounts.

## Candidate (NOT LIVE)
- Known, unambiguous accounts preserve their original stored currency.
- Verified built-in Baht/Bath remains THB (stable ID `acc_bath`).
- Duplicate aliases or corrupted `acc_bath` currency fail closed.
- An unknown historical account has `currency: null` and `unresolved: true`,
  rather than the **incorrect** default MMK.
- FX conversion routines do not invent MMK/THB/USD rates for such unknown
  identities. A UI warning says affected totals may be incomplete; the
  existing Analyze audit continues to expose the unmatched reference.
- No transaction, account ID, money amount, database field, RLS, authentication
  or rate quote is mutated. Original historical transactions remain untouched.

## Production read-only evidence
- The earlier 2026-11-03 aggregate check showed 221 non-empty account
  references, 220 same-owner matches and 1 unmatched reference.
- A follow-up aggregate-only SELECT determined the unmatched reference is
  one older destination-side record, not a Baht/Bath name, with no duplicate
  account-name groups. The original currency **cannot** be determined from
  this information.
- The orphan is intentionally **not** rewritten or auto-created. Individual
  owner approval and verified source metadata are needed for a correction.

## Release isolation
- APP-only `app.html` finance functions, an independent Node regression
  test file, this document and a CI workflow; no N10, Landing, SEO, PWA,
  Business, Supabase schema or production data changes.
- Compatible with merged APP V11 PR #44 read-only audit and #59 transaction
  field options; CI also runs their existing safety checks.
- No deployment until latest-main conflicts, relevant checks, and explicit
  user approval are verified.
