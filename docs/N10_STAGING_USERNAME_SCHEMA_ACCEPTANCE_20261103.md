# N10 Staging username reservation migration — approved acceptance

**Date:** 2026-11-03 UTC

**Owner authorization:** user expressly approved the immediately preceding request to migrate **exactly two username-registration auxiliary tables and three RPCs to N10 Staging**. No Production deployment, Edge activation or account data mutation was authorized.

## Scope executed (Staging ONLY)

- Supabase project ref: `ldivswlhtgmznzwhzsoi`.
- Migration name: `n10_staging_username_reservations_v1_20261103`.
- Reviewed SQL source: `security/n10-username-escrow-candidate/sql/staging_username_reservations_NOT_AUTHORIZED.sql`, pinned Git blob `340522c9830e961edd915c41ddc8b23e49e7ed5b`. The historical source intentionally lacked an approval SET; the explicitly approved operation was executed with a **transaction-local Staging-only approval setting** in the same transaction, preserving its hard guard and collision checks.
- Created **only** `public.mmh_n10a769_signup_reservations` and `public.mmh_n10a769_rate_buckets`.
- Created **only** `public.mmh_n10a769_reserve_username(text,uuid,text)`, `public.mmh_n10a769_claim_enrollment(text,uuid,text)` and `public.mmh_n10a769_take_attempt(text,integer,integer)`.
- Management action `apply_migration` returned `success:true`. No other schema, Auth, RLS, recovery phrase, encrypted backup, product App or public website objects were changed.

## Verifications performed after migration

- Exactly **2 new tables** exist, both with RLS enabled, no permissive policies, and `anon`/`authenticated` direct SELECT access denied. `service_role` has only the intended table privileges. RLS with **no policies** is intentional for this service-only data, not a public-access defect.
- Exactly **3 functions** exist, all `SECURITY INVOKER`; `anon` and `authenticated` have no EXECUTE privilege; `service_role` does.
- Malformed-input probes to reserve/claim/quota all returned `false` without any writes.
- A synthetic **service-role transaction** verified: first reservation succeeds, duplicate reservation fails, first claim succeeds, second claim fails, the first two rate-limit hits pass and the third fails. The transaction was explicitly `ROLLBACK`ed; final counts in both new tables are **zero**.
- A/B fixture state both before and after: **2 existing QA users, 2 fixed recovery verifiers, 2 encrypted backups**. No words or credentials were read or logged.
- Live Staging joint Vault Edge independently re-read as **v11**, `verify_jwt=true`, `RECOVERY_RELEASE_ENABLED=false`, expired `1970-01-01` deadline and empty owner allowlist.
- Staging security advisor reported only expected `rls_enabled_no_policy` INFO for the new service-only tables as part of a larger existing set, plus a pre-existing Auth password-leak-protection WARN. No out-of-scope settings were changed. Remediation reference for the latter: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Remaining before real end-to-end N10 staging signup

This approval does **not** authorize activation or deployment of the hard-OFF Production-v8-shaped username Edge candidate, real QA signup, Vault schema changes, MFA changes, or production merge. Review how to configure the dedicated Staging username candidate with the Staging project ref/origin, ensure private reservation/HMAC and Vault RPC privileges, and obtain separate scoped authorization for signed Staging QA before changing any live Edge function. The existing A/B original Recovery Key fixtures must remain unchanged.

**GitHub PR #74 remains Draft.** No merge or release to `main`.
