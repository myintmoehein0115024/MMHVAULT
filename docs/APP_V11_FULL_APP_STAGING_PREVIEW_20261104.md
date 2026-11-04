# APP V11.7 full local Staging APP preview — security and CI verification

Date: 2026-11-04. **This is a local preview build, not a deployment.**

## Construction
- Current PR #87 `app.html` (full APP, not a reduced mock) plus
  branch-specific `js/`, `css/`, `images/`, `fonts/` as present.
- Builder: `tests/build-app-v117-staging-preview.cjs`
- Static output: `dist/app-v117-staging/` (generated at CI runtime;
  not committed to Git or published to GitHub Pages).
- GitHub Actions workflow job **V11.7 local full APP Staging QA package
  (NO DEPLOY)** uses `actions/upload-artifact@v4` to produce a
  downloadable five-day testing artifact.

## Safety guarantees of the built artifact
- All copies of the original production Supabase host
  `vrypucmyrztxgiqhjspd.supabase.co` and its publishable key are
  replaced with the **Auth-Staging** host/public key in the output
  artifact only. None of these source files are modified in the repo.
- Security gate scans all packaged JS/MJS/HTML/CSS/JSON/text assets for
  any residual production host/key and fails the build if found.
- The HTML has a visible STAGING ONLY banner and noindex metadata.
- Browser-enforced CSP **connect-src is path-restricted** to
  Auth-Staging `/auth/v1/token`, `/auth/v1/user`,
  `/auth/v1/logout`, and the two owner-approved staging finance
  REST routes `/rest/v1/transactions`,
  `/rest/v1/personal_configuration`. All N10 Edge Functions,
  MFA/Recovery endpoints, other apps, and Production APIs are blocked.
  Storage/analytics/exchange API network calls can fail by design.
- No service-role key, cookie/session export, real password or JWT is
  packaged. Only a public Staging publishable key is embedded.
- Only the new `mmhvault-v11-manage-hierarchy-live.mjs` controller
  loads; the older PR #85 V12 field layout module is NOT loaded.
- Service workers and iframe embedding are blocked in the local
  preview; it has no deployment action.

## Tests

Tested GitHub code head:
`0118ede7a722a4c33bd56833e1ac01ce2a4af85c`.

**Five GitHub workflows passed, 8/8 jobs:**
- APP V11 hierarchy pure model and new-owner/legacy owner safety
- APP V11 linked Manage Chrome responsive UI
- APP V11 linked Manage WebKit responsive UI
- Full APP local Staging QA build and static safety assertions
- Finance data-link regression
- Native Accounts balance render
- Transaction field layout candidate
- Private Account photo review

The Chrome browser workflow also loads the actual local full APP preview
and checks its CSP blocks Production and Staging N10 Edge calls while
allowing the two approved finance REST paths. This is a browser
**network-boundary smoke**, not signed end-to-end APP acceptance.

Independent post-download ZIP inspection: **140 files**, valid archive,
no remaining production Supabase host/key string in bundled text assets,
Mac local server launcher present, CSP only the five allowed paths.
An earlier archive was intentionally rejected because copied legacy
scripts still contained production references; the corrected builder
and tests now fail on any such remnants.

## Mac local test use

1. Download the **latest verified archive** from this PR's
   `APP V11 hierarchy owner & archive safety (NO DEPLOY)` workflow
   artifacts. Do not use any old, unverified preview ZIP.
2. Extract it locally. Open Terminal in the extracted folder and run
   `bash START-STAGING-ON-MAC.sh` (Python 3 preferred; Ruby fallback).
3. A browser opens `http://127.0.0.1:8769/app.html`. Do NOT open
   `app.html` through `file://`, which prevents ES modules loading.
4. Confirm the yellow STAGING ONLY banner. Log in only with dedicated
   `v117qa` accounts, and test Manage Type→Transaction→Category,
   Add Transaction, Archive and history readback, then the second
   device for cross-device synchronization.
5. Close the Terminal server to stop the local test page.
6. If old N10/other pages fail because CSP blocks out-of-scope APIs,
   **do not loosen CSP**; those features are intentionally excluded.

## Still unverified

The local full APP has not yet been verified end-to-end with real
signed-in A/B Staging accounts or a second physical device; the previous
standalone JWT A/B QA did pass, but is a different limited test.
The Auth-Staging database contains only the two approved finance tables,
not a full copy of Production's wider business modules. Some unrelated
APP features can therefore error or remain unavailable in this preview.

The work must remain Draft until genuine APP integration, real
cross-device/mobile testing, latest-main conflict review, and a separate
Production release authorization.
