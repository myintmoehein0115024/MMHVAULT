# L1.24 Production release candidate — STAGED / NOT LIVE

Current main baseline: `1d2c012264a6ef3b7903461bc3f14a0e5d9f285f` | Landing baseline: `78b167a0e523883b4ef3e68130caf3a12135cc5e`.
**Do not merge PR #7 or publish these files automatically.** This is a non-production review package.

## Candidate files
- `index.html`: new Landing with production SEO, canonical, actual OG logo, WebSite/Organization JSON-LD, **no public-root noindex**, original N10 expired-recovery callback preserved verbatim, existing PWA manifest link and iOS home-screen metadata.
- `robots.txt`: allow public root and point to the existing canonical sitemap. This is not a security control.
- `mmh-manifest-v2.webmanifest`: a proposed copy of current manifest with **only** `start_url` changed to `./login.html?source=pwa&install=v2`. Requires N10 review, functional tests and explicit release approval. Existing PWA ID/scope/icons retained.

## Production gates
1. Fresh main diff; preserve latest auth/recovery routes from `index.html` and secure `login.html` unchanged.
2. Test PWA new/existing installs on iOS and Android (Safari/Chrome): ordinary browser opens Landing; installed launcher opens Login; valid sessions can reach App; expired sessions prompt login. Include Google OAuth, password recovery, logout, no redirect loops. Older iOS shortcuts may retain installed launch URL.
3. Confirm `https://mmhvault.com/sitemap.xml`, `robots.txt`, brand PNG HTTP 200; production canonical/title/JSON-LD; noindex on private App/Login/QA. Preview must stay noindex and not be published under main. Never rely on robots.txt to hide private data.
4. Screens 320/393/440, tablet 768/1024, desktop 1440; English/Chinese/Burmese, menu/CTA and responsive visuals.
5. Back up main root and manifest with exact rollback commit, coordinate release with N10 owner. Deploy index/SEO + approved PWA launch behavior in one controlled production transaction. If any gate fails, STOP; do not bypass authentication.
6. After successful release only, request GSC URL Inspection > Test Live URL > Request Indexing for https://mmhvault.com/, verify sitemap, monitor branded query. No guarantee of ranking/spell correction.

The release candidates live under `landing-assets/release-candidate/` and are **NOT** actual production root or PWA manifest files. Merging PR #7 alone does not publish Landing or swap root files. No financial data, DNS, Supabase, RLS, login.html, app.html or SW changes are authorized.

## L1.25 automated preflight (2026-11-01)
The repository `main` advanced to `d9e61e96d9ea30f1296d81594f87275179c85c3e` with a finance-account FX change and tests, but **not** `index.html`, `login.html`, `mmh-manifest-v2.webmanifest` or `sitemap.xml`. Confirmed by compare from original baseline `1d2c012264a6ef3b7903461bc3f14a0e5d9f285f`.

Run `node landing-assets/release-candidate/validate-release.mjs` from repo root to assert SEO, recovery-handler parity, login noindex, manifest diff, sitemap, robots draft, and trilingual Landing invariants. This is static validation only; the test uses the branch's checked-out root files. A fresh production main comparison **must still be repeated immediately before real cutover**; manual iPhone/Android PWA and real HTTPS/Google Search Console checks remain required.

Source-of-truth reminder: `https://mmhvault.com/` is currently served by GitHub Pages (the source tree includes root CNAME `mmhvault.com`); Cloudflare Pages preview is isolated and must not become an alternative indexed root. No production settings were changed during this preparation.

### L1.25 preview CI enforced
The isolated Cloudflare Pages project `mmhvault-landing-l1-preview` now prepends:

```sh
node landing-assets/release-candidate/validate-release.mjs && node --check landing-assets/landing.js
```

before the existing preview build command. Candidate files are **not** added to the Pages output allowlist. A failing static audit blocks new preview deployment, not production. Live PWA device/OAuth recovery and production HTTP checks are separate mandatory manual go-live gates. The latest main at inspection was `d9e61e96d9ea30f1296d81594f87275179c85c3e` (account FX implementation only), and production index/login/manifest stay unchanged.

## L1.25.1 candidate-only iOS standalone safeguard
The staged production `index.html` includes a narrow `mmh-pwa-standalone-root-bridge` immediately after the intact N10 expired-recovery handler. It redirects only Home Screen standalone root visits to same-origin `login.html?source=pwa`, does not activate in ordinary browsers, does not forward tokens or intercept OAuth/password reset callback params, and never handles the Login route itself. Eight VM simulations in the static preflight test cover ordinary browser / Android / iOS / OAuth / password recovery / loop prevention. The public preview and real production are still unchanged. Full installed-device testing remains required.

## L1.26 live HTTP audit (pre-production, read only)
`node landing-assets/release-candidate/audit-public-http.mjs` queries **only six public files** at `https://mmhvault.com`: homepage, robots.txt, sitemap.xml, public brand logo PNG, login.html and PWA manifest. Prints status, content type, canonical sitemap presence, noindex on Login, old/new homepage title and PWA start_url. It fetches no private APIs, emits no user records and has a per-request timeout. Missing robots or network failures are logged but do not fail the isolated preview build; final public go-live smoke checks must be repeated independently. As of 2026-11-01, Cloudflare browser-rendering directly fetched GitHub Pages' 404 content for `/robots.txt` (root `main` also contains no robots.txt), so this item remains an expected release dependency.

## L1.26 isolated physical-device PWA test page
Only the Cloudflare **preview** distribution may publish `/pwa-qa/` and `/pwa-qa/launch.html` with a dedicated `/pwa-qa/manifest.webmanifest` scoped to `./` and separately branded **MMH QA**. Install the test icon from iPhone Safari or Android Chrome, reopen and read the standalone-mode and start_url indicators. No account data, login UI, remote API or analytics is used. Chrome installed launch may honor the separate manifest start_url; iOS Home Screen may use the saved URL instead. This test proves preview install handling only, NOT the actual `mmhvault.com` existing installed App, which still needs production go-live checks. Remove the test icon after QA. Keep the entire preview `noindex`.
