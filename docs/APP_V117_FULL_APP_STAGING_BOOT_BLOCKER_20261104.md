# APP V11.7 — Full APP Staging preview hard-stop after Safari guard

Date: 2026-11-04. This report is **read-only diagnosis + QA scope correction**. No production deploy, table creation, or N10 work.

## Observed
The owner opened the previously downloaded local `OPEN-ME-STAGING.html` file in Safari. It rendered the account-security layer:

> Protecting your private data — Verifying the new account and loading cloud data before showing any account content.

The file itself loaded. This is not a "connection refused" problem.

## Root cause at the current approved Staging scope
The full app.html startup path `loadAll()` requires **transactions, investments, wallet movements, custom_investments**, and attempts **exchange_rates**. `investments`, wallet movements, and `custom_investments` load failures are **hard failures** in app.html. However the explicitly approved MMHVAULT-Auth-Staging database includes only two finance test tables: `public.transactions` and `public.personal_configuration`. The existing security guard must not be disabled to bypass this failure.

Therefore the two-table Auth-Staging is **insufficient to validate full APP boot**, even though the earlier standalone signed A/B token/RLS transaction and config tests passed. The previous local file package was a full APP build with a network-allowlist and was not a valid full-APP end-to-end acceptance environment.

## Safe action
- Stop presenting the local full-app preview as ready for logged-in end-to-end acceptance under this schema.
- Preserve the security overlay, owner isolation, production/N10 data and code; no forced fallbacks and no fabricated availability of absent Staging tables.
- A **separate, no-server core-only Staging Manage QA page** has been prepared as a conversation artifact, with the *exact V11.7 pure hierarchy model* inlined and strict CSP limiting the network to test Auth token/user and the two approved finance table REST routes. It supports Type→Transaction→Category setup, cloud readback, synthetic ledger record, Archive/history association check, and exact-marker cleanup. It is **not the full app.html, not production, and not real Safari/device acceptance**.
- The isolated QA page's JavaScript passed Node syntax checks, model-level add/recordLink/archive/storedLinkMatches tests, HTML unique-ID/element checks, and static production-URL/secret restrictions. Full live signed browser acceptance of this new page has **not** been claimed.
- The user's existing signed A/B standalone QA already passed; avoid unnecessary retesting unless new core UI/cloud coupling must be exercised.

## Required separate release gate
A full-app test would require an **explicitly approved isolated Staging schema** compatible with all genuinely required read-only APP services (plus testing policy) or a properly designed full-app limited QA adapter. Both need independent risk review; neither may rewrite production or N10 data. Continue PR #87 Draft and do not merge it until full-app verification, historical-owner compatibility, physical-device tests and main/PR #85 reconciliation are complete.
