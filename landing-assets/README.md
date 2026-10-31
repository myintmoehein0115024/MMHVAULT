# MMHVAULT Landing Page L1.0 — isolated handoff and review gates

## Scope
Base branch: `main`, initial audit SHA `1d2c012264a6ef3b7903461bc3f14a0e5d9f285f`.
Working branch: `feature/landing-page`.

Added **only**:
- `landing-preview.html` — semantic public brand/feature landing prototype
- `landing-assets/landing.css` — isolated responsive Premium Liquid Glass visuals
- `landing-assets/landing.js` — independent English/Chinese switch and accessible mobile menu
- `landing-assets/README.md` — handoff and release gate

The existing logo `images/mmhvault-logo-transparent.png` is referenced read-only.
No app/auth files, global CSS, Service Worker, manifest, DNS or finance data are modified.

## Preview: important deployment distinction
The branch is **not** published on `mmhvault.com` or GitHub Pages. To inspect locally:
1. In the GitHub branch selector choose `feature/landing-page`.
2. Use **Code → Download ZIP** and unzip it.
3. Double-click `landing-preview.html` to open it in a desktop browser.
4. Open browser responsive device mode to inspect mobile sizes.
No auth action should be tested from a local `file://` URL; the real Sign In / Get Started targets are `./login.html`.

For reviewing rendered code, `landing-preview.html` is self-contained with respect to application logic, but references two landing-only assets and the already-existing MMHVAULT logo. This avoids sharing the site's app CSS and JS.

## Verified routing and isolation
- On 2026-10-31, root `index.html` was a simple public introduction with an auth-recovery error route. **Keep that route when promoting Landing**.
- Existing `login.html` has Sign In / Sign Up tabs, as well as special recovery and OAuth flows. No unverified signup query parameter was introduced; all access buttons link to `./login.html`.
- Existing `privacy.html`, `terms.html`, `security.html` exist and are linked.
- Current PWA manifests both launch `./app.html`; `landing-preview.html` intentionally has **no manifest** and does not register a Service Worker.
- The root `sw.js` is the retired worker, and `mmh-push-sw.js` is push-only. Both remain untouched.
- No calls to auth, storage APIs beyond the dedicated harmless display-language key, third-party analytics or financial-data endpoints.
- All visuals are illustrative mockups with **fictional** example figures.
- Life Planner is labelled *Coming Soon* pending feature release confirmation.

## SEO (preview vs production)
- Present now: title, description, canonical pointing to intended eventual `https://mmhvault.com/`, Open Graph, Twitter summary metadata, WebSite JSON-LD, logo, semantic headings and crawl-readable English body copy.
- **Critical:** preview is explicitly `noindex,nofollow,noarchive` to prevent duplicate branding pages from being indexed.
- Only after explicit owner approval, stable N10 authentication, and final main comparison:
  1. Preserve `index.html`'s current recovery-error routing and ensure it still redirects an expired recovery link safely.
  2. Promote approved Landing markup to the official `index.html` in a separate authorized release.
  3. Remove the preview-only noindex for the official homepage; keep correct canonical / OG target.
  4. Verify `https://mmhvault.com/`, `/login.html`, OAuth callbacks, recovery callbacks, PWA start URL, and Home links in legal/security pages.
  5. Preserve DNS Search Console verification, current sitemap and PWA manifests; change only if separately authorized.
- Do not use claims like "bank-level", "100% secure", uptime or user/asset statistics.

## Manual responsive acceptance matrix
- 320x568, 375x812, 390x844, 430x932: menu opens/closes; cards stack; financial demonstration and phone overlay stay within viewport.
- 768x1024, 820x1180, 1024x768: section grids adapt; menu behavior at 840px cutoff.
- 1280x800, 1440x900, Mac Safari: full nav, dashboard mockups, footer and language toggling.
- Keyboard: Tab through menu, language toggle, links; Escape closes menu; visible focus.
- Reduced motion: OS setting disables smooth-scroll and transitions.
- Offline/local: no network API required for Landing, but existing login links cannot authenticate from file URLs.

## Release/rollback
1. **Do not merge draft PR automatically.** Review exact changed files and compare to latest `main`.
2. Stop if `main` has since changed `index.html`, `login.html` or PWA/Auth files until N10 owner confirms stability.
3. For approved release: back up old `index.html` content + commit SHA; ensure recovery-error handler and login routing remain intact.
4. Roll back by restoring that exact previous `index.html` blob/commit, not by reverting unrelated N10 work.
5. If any signup, MFA, recovery, push-install or financial regression occurs, stop promotion and restore the homepage only.

**Current state: branch-only prototype; no production deployment.**
