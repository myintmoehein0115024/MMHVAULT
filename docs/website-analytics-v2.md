# Website Analytics V2.3 — read-only production contract

**Status (2026-11-04):** V2.3 Phase B Worker and frontend were deployed under approved PR #117. Production GitHub Pages Build / Deploy succeeded. Final manual authenticated administrator acceptance is still pending; do not mark the project fully closed until that check is recorded.

## Read-only data source

Cloudflare GraphQL Web Analytics RUM for `mmhvault.com`, restricted by configured site tag, request host and `bot:0`, with a scoped read-only API token stored in a Cloudflare Worker Secret. No analytics token, server secret, personal visitor identifier, or finance data is returned to the browser.

## Published API routes

- `GET /api/admin/website-analytics?range=24h|7d|30d`
  - Verified aggregate Visits, Page views and hourly/daily trends.
  - `uniqueVisitors: null` when a trustworthy deduplicated distinct visitor count is unsupported.
- `GET /api/admin/website-analytics-breakdowns?range=24h|7d`
  - Five aggregated top-group lists: countries, pages, referral domains, browsers, devices.
  - Each group includes `pageViews` and `visits`, not verified unique visitors.
  - Private-looking paths are masked, unknown referral data is not misrepresented as certain direct traffic.
- The `30d` breakdown request is **explicitly disabled** (`503 breakdown_range_unverified`) due to observed Cloudflare grouping inconsistency; the base `30d` KPI and trend route remains available.

## Access control

Every API request requires a Supabase Auth JWT verified with the Auth service, followed by server-side administrator verification via `mmh_is_admin()` using the same bearer identity. Expected HTTP behavior:

| Request | Expected result |
| --- | --- |
| Missing/invalid Auth | 401 `authentication_required` |
| Authenticated non-admin | 403 `forbidden` |
| Disallowed Origin | 403 `origin_not_allowed` |
| Invalid range | 400 `invalid_range` |
| Authorized admin, valid 24h/7d range | 200 with verified aggregated metrics |
| Authorized admin requesting 30d breakdown | 503 `breakdown_range_unverified` |

The Worker restricts CORS, sets `private, no-store`, and does not log tokens, IDs, or upstream response bodies.

## UI contract

The premium responsive administrator page at `admin-analytics.html` uses `analytics-worker/ui/trend-chart.js` and `analytics-worker/ui/breakdowns.js`. Existing KPI/trend loading is independent of on-demand `Load breakdowns` requests. The button has a 30-second client throttle, safe DOM text rendering and stale-request cancellation; the five cards render for 24h and 7d only. When 30d is selected, explain the pause and keep the existing totals/trend.

## Release record and rollback

- Production Worker: `mmhvault-website-analytics-v2`
- New version: `e370c807-79d0-46b5-b8b2-8fe518ff5ffd`
- Preserved rollback version: `6d3c2704-b038-4351-8a19-cabfc3f9f6b2`
- PR #117 merged into main: `f6f7a56b546552d317039a3d574d605a1feae230`
- Pages deployment: https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41827446621

Independent Staging A/B real HTTP tests passed for authorized A, forbidden B, unauthenticated request, bad range and bad Origin. The temporary Analytics A admin grant was revoked. Secrets and existing Worker binding values were retained by strict inherited bindings. No N10, Landing, APP V11, production Supabase/RLS or financial data was modified by this Analytics release.

**Closeout gate:** A production administrator must visually verify 24h and 7d real breakdown cards, original 24h/7d/30d KPIs and trends, and the disabled 30d breakdown. Do not claim this check passed without real administrator evidence.

## Preservation rules

Keep all Analytics security tests, Worker source, UI modules, GitHub workflow, and `wrangler.toml`; these are operational, not redundant. Delete a file only after a documented no-reference/no-dependency check and a separate scoped review. Do not alter open PRs or assets owned by other parallel projects.
