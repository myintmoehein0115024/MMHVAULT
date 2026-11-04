# Website Analytics V2 — isolated implementation contract

Status: development only. Do not deploy or expose statistics until the data API and authorization are verified.

## Data source
Cloudflare Web Analytics site: mmhvault.com. Read data only from the documented Cloudflare GraphQL Analytics API using an account-scoped, read-only credential held in a server-side secret. Never embed a Cloudflare API token in HTML, client JS, or GitHub.

## API contract (proposed)
GET /api/admin/website-analytics?range=24h|7d|30d

Server MUST:
- Validate an authenticated Supabase session, then verify server-side admin authorization (never trust client flags or email alone).
- Restrict query to the mmhvault.com site tag and permitted time windows.
- Return only aggregate visits, pageViews, time series, and available aggregate geography; omit unavailable metrics instead of estimating.
- Return 401 for unauthenticated, 403 for non-admin, 503 for unavailable upstream. Set Cache-Control: private, no-store and appropriate CORS.
- Enforce rate limiting and avoid logging access tokens or financial/user details.

## Frontend
A separate Website Analytics tab/panel in admin.html, responsive and consistent with existing styling. Never block existing member metrics. Render loading, empty, permission-denied, and API-unavailable states. Show source and last-updated timestamp.

## Release gate
Confirm GraphQL dataset/schema and read-only token permissions; implement and test server-side authorization, including a non-admin denial; pass existing CI and regression; compare latest main; obtain explicit approval before production deployment if additional infrastructure or secrets are required.

## Boundaries
No changes to login, auth flows, Supabase RLS, APP finance logic, DNS, production secrets, or other parallel projects.
