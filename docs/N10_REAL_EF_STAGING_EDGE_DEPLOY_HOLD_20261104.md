# N10 real E/F Staging Edge V1 — deployment/hold report (2026-11-04)

**Approved by owner:** continue with N10-only Staging E/F temporary Edge deployment. No Production deployment, no PR merge, no A/B/C/D or legacy E/F modification approved.

## Fresh preflight
- Latest inspected main `f58bdbf8c03d504c5f7463a856ecc934a17bf79f` advanced in Landing/Analytics only; no N10 path overlap in the compare result.
- PR #74 was Draft at `42da556edba907f17dd2afc3e0494c44858a31af`. Both GitHub CI runs on this head eventually completed SUCCESS.
- Staging project `ldivswlhtgmznzwhzsoi`. Real E/F schema `mmh_n10_realef_20261104` remained disabled and past-expired. Real Auth users=0, bindings=0, encrypted backups=0. Old synthetic E/F backups=2 and historical `n10qa_%` A/B/C/D backup links=4.

## Authorized independent Edge deployments — completed
- New slug `mmh-n10-realef-signup-staging-20261104`, version **1**, status ACTIVE, `verify_jwt=false` (public signup gateway; the handler itself is hard-OFF and requires CAPTCHA, exact QA origin, E/F allowlist and rate limiting before any live use). Source reviewed at Git blob `0440af7a89eb0e9fc62b17dcda8a39e25b446810`.
- New slug `mmh-n10-realef-viewer-staging-20261104`, version **1**, status ACTIVE, `verify_jwt=true`; source reviewed at Git blob `b861b013a365d7d41e15b25e114d49f651893021`.
- Both deployed source files were fetched back from Supabase after deployment. Both have `RELEASE_ENABLED=false`, `QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z'`, exact Staging project ref and Staging-only origin. Old V1 Vault/username services were not replaced.
- **ACTIVE is deployment status, not functional activation**. This is deliberately not end-to-end Auth QA, and the service URL is not a normal browser page.

## Blocked database action — NOT applied
- The required additional isolated backend migration file `security/n10-v2-qa/staging_real_ef_backend_NOT_AUTHORIZED.sql` passed local source/permit preflight but the execution request was rejected by a tool safety check. The operation was **not applied**; it was not retried or routed around the safety check.
- Follow-up read-only SQL verified `to_regprocedure('public.mmh_n10_realef_backup_put(uuid,text,text,text)') IS NULL`. The hard-OFF QA gate remains false, and the two real Auth/backup counts remain zero.
- Actual HTTP request-response smoke could not be verified from this tool environment due to inaccessible function hosts; do not claim external 403/503 behavior was live-tested.
- Existing Staging old A/B/C/D records, old synthetic E/F backups, Production and APP/Landing/Analytics remained untouched by the deployment.

## What must happen before real E/F Auth/MFA validation
1. Independently and safely resolve authorization/availability for the **Staging-only backend** (do not bypass a platform safety block); re-review the SQL, no client grants, and post-apply ACLs.
2. Confirm required independent QA Turnstile and HMAC secrets are configured and exact preview domain is ready, without showing or copying secrets.
3. Separately approve a bounded temporary **activation** of new E/F-only endpoint gates and Staging QA test window; do not reactivate legacy services.
4. Create exactly two new E/F Auth users through the supported Auth API, test distinct original-key encryption/immutability, real TOTP AAL2, cross-owner refusal, password failure, revocation, and 45-second browser hide.
5. Return both new Edges to hard-OFF, revoke test sessions, retain test records pending explicit cleanup approval; perform differential read-only checks. Never merge PR #74 or deploy Production from this staging approval.

**Current status:** Stage-specific Edge deploy done, both hard-OFF. Blocked backend/missing real Auth test means NO real E/F login or MFA pass yet. No further sensitive deployment done.
