# N10 — Signed-URL lifetime and privileged Edge access review
Date: 2026-10-31. Scope: production READ-ONLY inspection; edits ONLY to N10 feature branch. No live SQL, Edge deployments, auth or financial data changed.

## Critical finding: Private files are also accessible through temporary signed links
The original production app.html had eight createSignedUrl calls: five for 3600 seconds (receipts, investment documents, profile photos), two for 600 seconds (feedback/support), and one for 60 seconds (upload probe). Six private receipt upload paths requested cacheControl 3600 seconds. A local profile-photo signed URL remained cached for 55 minutes.

Supabase Storage documentation confirms signed links are bearer links that cannot be individually revoked; even after expiry, cached responses may remain accessible until their cache lifetime ends. A new MFA restrictive RLS guard limits issuance after verification, but does NOT retroactively revoke previously issued signed links.

### Feature branch mitigation (not deployed)
- Seven user-visible URLs now have 300-second signing TTL (5 minutes). The single 60-second probe remains 60 seconds.
- All six receipt-upload codepaths now specify 60-second cacheControl for new uploads.
- The profile-photo signed-link memory cache now lasts 4 minutes instead of 55.
- New tests count and bound all eight signing sites, six upload cache settings, and the profile cache expiry.
- Already-issued links and previously uploaded objects' metadata cannot be fixed by a frontend-only patch. Require separate owner approval before disruptive CDN or signing-key revocation; the default release plan should allow existing links to expire naturally and assess any remaining cached copies.

## Read-only inventory of nine active production Edge functions

| Endpoint | Existing caller authorization | N10 release requirement |
|---|---|---|
| mmh-financial-assistant | Live user JWT, data access through caller RLS | Fail closed on enrolled AAL1 before reading data; candidate prepared |
| mmh-push-test | Live user JWT, privileged PostgreSQL connection | Explicit MFA check before privileged subscription query and push send; candidate prepared |
| mmh-n10a781-bind | Manual user JWT check and existing MFA-assurance gate | Retain guard before any sensitive username binding |
| mmh-n10a783-phrase-verify | Manual bearer check, no per-factor gate in original source | NEW candidate gate protects saved recovery phrase verification and account status |
| mmh-n10a769-username | Public signup/password/recovery-word login with rate limits/CAPTCHA | Must remain usable pre-login, no blanket MFA gate |
| mmh-n10-a740-username | Disabled QA gate with JWT check | Keep gated, no accidental legacy activation |
| mmhvault-support-cleanup | Service-specific cleanup token confirmed by RPC | Preserve service auth, never require a user's six-digit code |
| mmh-push-dispatch | Cron token from request header | Preserve service auth, do not bypass/reuse user MFA |
| mmh-invest-auto-capture | Backend token authenticated by mmh_verify_invest_capture_token | Preserve background operation and separate secret scope |

verify_jwt=false does NOT necessarily mean an unprotected public API, but it does mean service code must enforce intended credentials and caller authorization. Privileged service-role/Postgres operations do not automatically inherit user RLS.

## Remaining release blockers
- Exact production RLS, private Storage and wallet RPC MFA policies are still candidate-only.
- AI, Push Test and saved-phrase verification Edge MFA gates are still candidate-only and need signed-token tests.
- Previously signed URLs, CDN caches, and previously uploaded object cache settings remain outside the frontend's immediate revocation control.
- Complete production-like negative/positive testing, real two-account regression, and backup/rollback rehearsal.
- Separate explicit owner consent required before production deployment, PR merge, secret changes or changes to app.html/login.html on main.

References: Supabase official Storage Serving Assets documentation and Smart CDN caching documentation.
