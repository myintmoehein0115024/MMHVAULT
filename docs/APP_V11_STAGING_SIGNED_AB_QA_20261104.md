# MMHVAULT APP V11.7 — Staging signed A/B browser QA handoff
Date: 2026-11-04. **Development only / no production merge or deployment.**

## Authorized scope
Owner approved testing **two isolated, empty finance tables** in
`MMHVAULT-Auth-Staging` (`ldivswlhtgmznzwhzsoi`) with
dedicated synthetic A/B identities. Production, N10 MFA/Recovery, existing
N10 users, secrets and records are out of scope.

## Confirmed completed
- `public.transactions` and `public.personal_configuration` were created
  in Auth-Staging only. Both tables have RLS enabled, no anon SELECT access.
- Staging-only migration `app_v117_staging_config_owner_cleanup_20261104`
  added an owner-only `DELETE` policy to the newly created
  `personal_configuration` **test table**, so a dedicated QA identity can
  remove its own temporary config after verification. This does **not**
  change Production's config access model. Eight policies now protect the
  two Staging tables.
- A/B **SQL role/claim simulations** independently verified that A cannot
  delete B's configuration, B cannot delete A's, while each can delete
  its own. All SQL test inserts ran in a transaction ending in ROLLBACK.
- Last read-only table inventory before signed-user testing:
  **0 transaction rows / 0 configuration rows**.
- A single-file signed-user QA page was prepared locally; it has a
  fixed Staging project endpoint, a **Staging publishable (nonsecret) key**,
  no service-role key or Production URL. Password and JWT are only kept
  in browser memory and are never stored or written to reports.
- Keyless source template:
  `tests/app-v117-staging-signed-ab-qa.html`. Its actual publishable key
  is intentionally replaced with a placeholder in the public repository;
  this is **not directly runnable** until supplied with the key.
- Browser-only synthetic transport acceptance locally exercised the actual
  QA page in Chrome (393px mobile) with mocked Auth and REST responses:
  27 positive checks, including owner separation, transaction-ID linkage,
  Archive, stale-CAS rejection and cleanup, with **zero residual rows**.
  This is not evidence of a real signed JWT or live Data API write.
- Review-only GitHub CI includes contract assertions and mock REST transport
  tests in Chrome and WebKit, including a deliberately failing cross-owner
  leak that must never be reported as success; see corresponding
  `tests/app-v117-staging-signed-ab-qa*` scripts and workflow.

## To perform real signed JWT acceptance (not yet completed)
1. Use **two newly created, dedicated Auth-Staging synthetic accounts** A
   and B with email local parts containing `v117qa` and independent
   credentials. Do not reuse real users or existing N10 test identities.
   The QA page does not create/alter Auth users; it only signs in.
2. Open the separately supplied downloadable QA HTML in a browser. The
   GitHub source is a keyless template for review, not the ready-to-use file.
3. Log in both synthetic accounts. Their credentials go directly to the
   fixed Staging Auth endpoint, not to GitHub or ChatGPT. Check consent.
4. The page refuses to run if either account has pre-existing transactions
   or configuration. The QA uses each identity's own JWT to create
   temporary rows, perform all cross-user RLS checks, verify saved
   hierarchy and stale-write protection, then delete exact temporary rows.
5. Verify the final page reports both acceptance and successful cleanup.
   If cleanup fails, keep the page open and use its owner-only retry.
6. For cross-device persistence, independently repeat an owner-only
   readback from a second signed-in browser/device; no automatic claim
   of physical-device validation is made by the current tool.

## Stop conditions
- Missing synthetic accounts, an unauthenticated result, a stale config,
  pre-existing financial data, cross-owner visibility, failed cleanup,
  any connection to a non-Staging URL, or a failed error-injection test.
- Do not change N10 Auth signup settings, existing MFA credentials,
  Production Supabase or Cloudflare Pages.
- No real end-to-end Auth-JWT browser acceptance was executed during this
  review: **the milestone remains PENDING** until actual independent
  synthetic credentials and signed browser runs exist.

## Release gate
Keep Draft PR #87 unmerged. Reconcile overlapping Draft PR #85 against
latest main, then independently review real Chrome/Safari/iOS/Android
behavior and the original APP V11 history/Finance regression before
requesting explicit Production merge permission.
