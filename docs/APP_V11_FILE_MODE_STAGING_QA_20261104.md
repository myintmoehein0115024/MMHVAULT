# APP V11.7 — No-server Mac Staging file-mode QA

Date: 2026-11-04. This is a **local QA artifact**, not a Production release.

## Why it was added
A macOS tester repeatedly saw `ERR_CONNECTION_REFUSED` at
`http://127.0.0.1:8769/app.html` because neither the default Python
launcher (Xcode CLI placeholder) nor the alternate Ruby server was running.
The site itself was not reached. No authentication or Supabase data was
implicated by that screenshot.

## Safer direct-open workaround
- The existing branch-only `tests/build-app-v117-staging-preview.cjs`
  first builds a complete local APP package, substituting the Auth-Staging
  host/public key in copies only. The CSP permits only Auth-Staging
  session endpoints and the two previously approved finance REST tables.
- `tests/build-app-v117-doubleclick.cjs` uses a pinned test-only
  esbuild dependency to bundle the existing linked Manage ESM modules
  as one inline, self-contained classic script; it produces
  `OPEN-ME-STAGING.html`. This avoids Chrome's file:// ESM/CORS module
  import restriction without changing the actual repository APP.
- Existing local `js/`, `css/` and images remain in the same extracted
  directory. The user only needs to **double-click OPEN-ME-STAGING.html**,
  no Terminal, localhost, Python, Ruby, Xcode or server.
- QA-only `READ-ME-FIRST.txt` explains the exact steps and the visible
  `STAGING ONLY · DOUBLE-CLICK MODE` banner.
- CSP still explicitly blocks Production, N10 Edge functions, unexpected
  cloud paths, web workers and non-Staging origins. Only the dedicated
  `v117qa` accounts should be used. No real data or secrets are included.

## Verification and limits
- Node static security test verifies no Production URL/key, inlined ESM,
  Staging-only auth/table CSP, no active legacy V12 manager, and full APP
  HTML payload. Tests generate separate temporary output directories to
  avoid concurrent finance workflow test artifacts overwriting each other.
- Chrome Playwright launched `file:///.../OPEN-ME-STAGING.html` **without a
  server**, observed the visible banner, V11.7 controller boot,
  local JS/CSS availability, and no Production requests. CDN and Auth
  requests were mocked/aborted; the browser smoke did not use real JWTs.
- The GitHub Actions Staging-only package artifact ZIP was inspected:
  valid ZIP; **142 files**, `OPEN-ME-STAGING.html` present; no Production
  Supabase host/key string in bundled HTML/JS/CSS/text assets.
- The previous full standalone Auth-Staging JWT A/B test DID pass and
  successfully cleaned temporary financial rows, but does not replace
  an end-to-end test of this full APP local file mode.
- This change does **not** modify any Production files, merge PR #87,
  publish GitHub Pages, or alter N10 Supabase schema/users.
- If the tester gets a blank login page or an application/network error,
  take a screenshot; **do not disable browser security** to bypass errors.
  The full APP has other features whose APIs are intentionally blocked by
  the restricted two-table Staging sandbox.

PR #87 stays Draft. Real second-device/browser user journey and mobile
Safari/Android tests remain pending after the local APP opens.
