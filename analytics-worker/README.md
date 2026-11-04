# MMHVAULT Website Analytics V2.3 — production status

**Status:** Phase B is deployed as of 2026-11-04; the production worker and GitHub Pages build have passed their release checks. The signed-in production administrator's final 24h/7d/30d visual acceptance is the remaining closeout gate. **Do not treat that manual acceptance as complete until recorded.**

## Production services

- Admin UI: https://mmhvault.com/admin-analytics.html
- Worker: `mmhvault-website-analytics-v2` (workers.dev, not a production routing change)
- Deployed version: `e370c807-79d0-46b5-b8b2-8fe518ff5ffd`
- Rollback version: `6d3c2704-b038-4351-8a19-cabfc3f9f6b2` (preserved in Cloudflare Worker Versions)
- Source merge: PR #117, GitHub main commit `f6f7a56b546552d317039a3d574d605a1feae230`
- Verified GitHub Pages run: https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41827446621

This isolated worker is **read-only**. The frontend never receives Cloudflare credentials. The only site analytics source is Cloudflare GraphQL RUM filtered to `mmhvault.com`, the configured site tag, and `bot:0`.

## Metrics and limitations

- The original 24h, 7d, and 30d Visits, Page views, and responsive trend chart remain supported.
- Hourly display labels can switch between UTC and Bangkok (UTC+7) for the 24h trend.
- The five **on-demand** breakdowns (Countries, Popular pages, Referral domains, Browsers, Device types) are available for 24h and 7d. They are ordered by page views and limited to the top groups. A 30-second client throttle reduces repeated Cloudflare GraphQL queries.
- **30d breakdowns are intentionally disabled** because upstream country grouping was inconsistent across periods. The normal 30d totals and trend are not disabled.
- Unique visitors remains `—` when a verified deduplicated count cannot be provided; do not substitute Visits or invent an estimate.
- Potentially private paths are redacted server-side before returning page-group labels. Unknown referrers are not assumed to be confirmed direct traffic.

## Access control and security

Requests require a current Supabase Auth JWT and a server-side `mmh_is_admin()` check. Anonymous, expired or unauthorized identities must never access aggregate breakdowns. The Worker enforces the configured allowed Origin and returns `Cache-Control: private, no-store`. Never print JWTs, upstream GraphQL errors, credentials, or visitor identifiers.

Production Cloudflare bindings (preserve names and existing values):

| Binding | Type |
| --- | --- |
| `CF_ANALYTICS_TOKEN` | secret_text |
| `SUPABASE_ANON_KEY` | secret_text |
| `CF_ACCOUNT_ID` | plain_text |
| `CF_SITE_TAG` | plain_text |
| `SUPABASE_URL` | plain_text |
| `ALLOWED_ORIGIN` | plain_text |

The 2026-11-04 controlled Worker version was uploaded with **strict inherited bindings**. No Secret values were exported or replaced. Keep the previous Worker version available for rollback.

## Verified checks

- Independent Auth-Staging QA: synthetic administrator A returned HTTP 200 verified 24h and 7d breakdowns for all five categories; ordinary account B returned HTTP 403 for both periods; no Auth returned HTTP 401; bad Origin returned HTTP 403; invalid range returned HTTP 400.
- Temporary Staging admin grant revoked (0 remaining). The independent A/B QA Worker was deleted. The two dedicated ordinary Auth-Staging users were retained; the original 14 staging users were not changed.
- GitHub PR #117 security CI #78 passed, and the production GitHub Pages Build/Report/Deploy jobs passed.
- The production API was checked for unauthenticated rejection and invalid range, and the public admin page loads its breakdown module. A live authenticated **production administrator** 24h/7d/30d UI walkthrough is still required to close the release.

## Operator checks / rollback

1. Sign into the production administrator dashboard. Check original 24h/7d/30d totals and trends, and the 24h/7d Load breakdowns interaction.
2. For 30d, confirm the breakdown button is disabled with the upstream-verification explanation.
3. If the Worker causes a critical regression, redeploy preserved version `6d3c2704-b038-4351-8a19-cabfc3f9f6b2` at 100% and stop the rollout. Verify original KPIs.
4. Never change N10, APP V11, Landing+SEO, production Supabase/RLS, or financial data as part of Analytics closeout.

## Local regression checks

```sh
node --test analytics-worker/test/*.test.mjs
node --check analytics-worker/src/index.js
node --check analytics-worker/ui/trend-chart.js
node --check analytics-worker/ui/breakdowns.js
```

All committed `analytics-worker/test/*.test.mjs` fixtures remain needed for authorization, source integrity, and UI regression coverage. Do not delete them as apparent "unused" files.
