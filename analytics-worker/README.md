# Analytics V2 isolated Worker

Status: **ISOLATED TEST WORKER EXISTS / FULL ANALYTICS CODE NOT DEPLOYED / NOT PRODUCTION READY**.

Cloudflare test Worker: `mmhvault-website-analytics-v2.myintmoehein0115024.workers.dev`. Its `workers.dev` route is enabled, but it currently runs a fail-closed placeholder returning HTTP 503. A scoped Account Analytics Read token was created and the secret write operation succeeded; the secret binding was not independently verified. The complete analytics code has not been uploaded. Never infer that a Worker URL or a successful CI run proves the GraphQL integration works.

This Worker is a separate backend for the admin-only Web Analytics page. It has no production routes and cannot modify N10, APP, RLS, or financial data.

## Prerequisites
- Confirm Cloudflare GraphQL RUM dataset fields and date grouping using the scoped read-only token.
- Confirm Supabase `mmh_is_admin` RPC checks the calling JWT and cannot be bypassed.
- Complete security review of the read-only token's account scope and secret storage.
- Configure a verified API origin in the admin frontend (currently `window.MMH_ANALYTICS_API_URL` is deliberately empty, so the page fails closed).
- Confirm end-to-end unauthorized/non-admin/admin tests before any deployment.

## Local checks

```sh
node --test analytics-worker/test/*.test.mjs
node --check analytics-worker/src/index.js
```

## Deployment configuration

`wrangler.toml` defines a standalone `workers.dev` service without production routes. The following are **secrets**, never put them in code, `wrangler.toml`, GitHub Actions logs or chat:

- `CF_ANALYTICS_TOKEN` — scoped account analytics read-only token
- `SUPABASE_ANON_KEY` — Supabase public publishable/anon key (kept as secret for consistency)

The account and RUM site tag are identifiers, not credentials. The Worker returns 503 on any unverified GraphQL response. Do not interpret HTTP 200 as success if the GraphQL `errors` array is populated.

**Important:** do not deploy from this draft PR until the GraphQL query and hosting/auth assumptions have been validated.

## Remaining release gates

1. Inspect Worker secret bindings without reading their values; check both `CF_ANALYTICS_TOKEN` and `SUPABASE_ANON_KEY` exist. Never paste secrets in issues or chat.
2. Validate the GraphQL RUM query against the live Cloudflare schema and correct the `visits` / `pageViews` semantics before publishing metrics.
3. Deploy the reviewed module through an approved Cloudflare deployment workflow; preserve existing secret bindings and set only non-secret vars.
4. Confirm HTTP 401 without bearer, 403 for authenticated non-admin, 200 with real verified metrics for an admin, and no CORS permission for an unapproved origin.
5. Only then set the frontend API URL, test on mobile and desktop, and request separate approval before merging PR #95 or changing production.
