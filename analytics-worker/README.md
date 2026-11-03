# Analytics V2 isolated Worker

Status: **NOT DEPLOYED / NOT PRODUCTION READY**.

This Worker is a separate backend for the admin-only Web Analytics page. It has no production routes and cannot modify N10, APP, RLS, or financial data.

## Prerequisites
- Confirm Cloudflare GraphQL RUM dataset fields and date grouping using the scoped read-only token.
- Confirm Supabase `mmh_is_admin` RPC checks the calling JWT and cannot be bypassed.
- Complete security review of the read-only token's account scope and secret storage.
- Configure a verified API origin in the admin frontend (currently it calls a same-origin route that does not exist).
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
