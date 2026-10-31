# MMHVAULT Landing + SEO combined production launch — L1.23 preparation

Status: STAGED ONLY. Never merge or deploy production without a fresh main review, N10 coordination and separate explicit go-live acceptance.

Prepared 2026-11-01 (Thailand). Feature branch: `feature/landing-page`. PR #7 stays DRAFT. This file is not routed publicly as a production launch page.

## Intent
- Public HTTPS `https://mmhvault.com/` -> indexable premium Landing.
- Installed iPhone/Android home-screen PWA -> existing secure login page if session absent/expired. Existing valid session may proceed securely to app (no auth bypass).
- Free Google brand recognition: canonical, visible brand, WebSite JSON-LD, verified image path, sitemap, robots, Google Search Console URL inspection.
- No fake ratings, organizations/legal registration, success claims or fabricated numbers. Life Planner and Business remain labeled concept / coming soon.

## Files and source cross-check performed
- Production `main` at preparation: `1d2c012264a6ef3b7903461bc3f14a0e5d9f285f` (must be re-read immediately before release; other N10 work is active).
- `index.html` includes critical inline `mmh-n10-recovery-error-route`. It detects only hash `error=access_denied&error_code=otp_expired` and safely redirects to `login.html?recovery_error=expired`. This must survive replacement exactly in semantics; never copy OAuth tokens/entire hash or overwrite callbacks.
- `mmh-manifest-v2.webmanifest` currently starts `./app.html?source=pwa&install=v2`. N10/PWA owner must review changing the start entry to login and confirm existing iOS standalone shortcuts, OAuth callback, signed-in session, push notification routing and old installations.
- `sitemap.xml` already lists canonical homepage plus privacy/terms/security. Validate live HTTP response and sitemap XML on release.
- `robots.txt` is absent in GitHub main. Prepare allow-crawl public policy with sitemap reference at cutover; do NOT block indexed Landing or rely on robots.txt as a privacy barrier. Verify login/app/QA `noindex` and existing authenticated data protection. Preserve `login.html` noindex. Never expose a session or user data to crawlers.
- Public image exists in main at `images/mmhvault-logo-transparent.png`. Confirm production HTTP 200 and correct content-type for Open Graph image.
- Preview uses HTML noindex AND Cloudflare Pages `X-Robots-Tag: noindex, nofollow, noarchive` — KEEP both until release. Never make Pages preview indexable.
- The Landing PR contains ONLY new Landing assets and preview HTML; merging the PR alone does not replace production `index.html`. A separate controlled root-file integration is necessary.

## Launch sequence: a single atomic coordinated release
1. Pause concurrent N10 writes; read fresh main, file SHAs, active auth/PWA controls and SEO assets. Back up current production main index + manifest and record rollback commit.
2. Review current PR #7 diff and compare with HEAD; verify all changes are constrained to Landing and static assets. Preserve root recovery-error handling, existing security/auth routes, and public policies.
3. Build the new root `index.html` by adapting staged `landing-preview.html`, preserving the recovery-error route, with production SEO and canonical. Remove HTML `noindex` ONLY from the new public production root. Never use preview-only `X-Robots-Tag` for production.
4. Include `landing-assets/*`, proper same-origin login links, and correct SEO title/description/Open Graph / JSON-LD. Ensure actual image URLs return 200.
5. Coordinate minimal manifest/start_url change with N10/PWA owner. Never change authentication or dashboard calculations. Test iPhone Safari Add-to-Home-Screen and Android Chrome installed PWA separately; old installations may retain a prior launch URL.
6. Add or review `robots.txt`; verify live `sitemap.xml` homepage canonical and public pages, not private dashboard/QA. Respect `noindex` and auth protections on sensitive pages.
7. Test desktop and narrow 320/393/440 phones and 768/1024 tablets, EN/ZH/MY; check navigation menu, CTA, business concept labels, iframe-less demos, XSS-safe text, login redirect, recovery callback, Google OAuth and logout/return.
8. Deploy production in a reversible, approved main update. Smoke-test HTTPS root title, visible content, canonical, JSON-LD syntax, public image, robots/sitemap HTTP codes, no accidental indexability of private routes, and PWA start behavior. Roll back on any broken auth or recovery behavior.
9. After successful PUBLIC release only: open Google Search Console URL Inspection for `https://mmhvault.com/`, run Live Test and Request Indexing; resubmit/confirm sitemap and monitor query `mmhvault` over days/weeks. Search ranking and Google's spelling corrections are never guaranteed.

## Stop gates
- If main advanced unexpectedly or N10 branch conflicts: STOP before modifying production.
- If PWA launch/login callback regression, noindex/canonical mismatch or recovery handling lost: STOP and roll back.
- Never merge PR #7 automatically, toggle auth security settings, alter financial data or reveal user records.
