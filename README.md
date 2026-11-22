# MMHVAULT

**Public website deployment repository** · [mmhvault.com](https://mmhvault.com)

This repository publishes the existing MMHVAULT site. Its root HTML entry points are intentionally retained to avoid breaking installed PWAs, bookmarks, SEO URLs, notification links or authentication redirects. Do not rename or move these files without a separate routing-and-deployment migration.

## Site areas

| Area | Entry point / files | Purpose |
| --- | --- | --- |
| Landing | `index.html`, `landing-assets/` | Public homepage, styles and scripts |
| Public information | `about/`, `features/`, `register/`, `security.html`, `privacy.html`, `terms.html` | Public pages and policies |
| Login & account recovery | `login.html`, `username-setup.html`, `js/mmhvault-n10-*` | Authentication-facing UI |
| Personal finance App | `app.html`, `css/`, `js/` | Accounts, Transactions, Reports, Future and other finance tools |
| Business | `business.html`, `business/` | Logged-in business workspace and public business information |
| Admin & analytics | `admin.html`, `admin-analytics.html`, `analytics-worker/` | Admin UI and analytics worker |
| Shared media | `images/` | Logos, icons, illustrations and feedback artwork |
| PWA / SEO | `mmh-manifest*.webmanifest`, `sw.js`, `mmh-push-sw.js`, `CNAME`, `sitemap.xml`, `robots.txt` | Stable install, push, domain and search integration |
| Maintenance | `.github/workflows/`, `.github/audits/`, `_config.yml` | CI and publish-exclusion safeguards |

## Repository boundaries

- **Public:** website runtime, deployment assets and a minimal set of runnable review workflows.
- **Private source repository:** complete development source, SQL review materials, synthetic QA fixtures, internal tests and historical release-gate workflows.
- Existing CSS and JS files carry historical version names. Do not merge or delete them merely because the names resemble one another: stylesheets load in order and different versions may apply cumulative overrides.
- Legacy PWA manifests and service workers remain to protect existing installations; removal requires separate real-browser verification.

## Safe editing rules

1. Keep `index.html`, `login.html`, `app.html`, `business.html`, and `admin.html` at their current public URLs.
2. Do not store credentials, member finance records or private SQL reviews in the Public repository.
3. Change runtime paths and their HTML/CSS/JS references together, and preserve the Private runtime mirror.
4. Review changes in a separate branch/PR; do not deploy a directory cleanup without approval.
5. The Public Git-history security audit is **manual only**. App, auth and financial regression tests are maintained in the Private repository.

No changes here modify Supabase schemas, credentials or member data.
