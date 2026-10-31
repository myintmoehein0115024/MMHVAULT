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
