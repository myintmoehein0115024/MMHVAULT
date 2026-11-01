# N10 financial workspace MFA gate — review-only

Status: ISOLATED CANDIDATE. No deployment. No app.html edit in this branch. No Auth, RLS or Vault change.

## Finding
On main commit 80833aa8f5b33785b861d9a5b21a3a6b67253f52, app.html checked only whether nextLevel was aal2 and currentLevel was not aal2. Missing/unknown levels had no explicit reject path. Same-UID Auth refresh updated profile without MFA recheck, and resume verified identity but not assurance.
This is a possible FRONTEND fail-open condition, NOT a proven database or backend authorization bypass. UI controls are defense in depth only.

## Files and scope
- guard.mjs: fail-closed owner, session-token, assurance and verified-factor checks; allow/challenge/deny.
- preview.mjs: creates a full patched app.html preview IN MEMORY only, with strict source-drift assertions. Never writes the production file or mutates the repository's app.html.
- test-preview.mjs: isolated synthetic assurance matrix, extracted injected-helper execution and unchanged-finance source tests. No real sign-ins, finance, secrets or network.
- Separate GitHub Actions workflow: review-file-scope guard plus offline Node checks. No deployment credentials or actions.

## Risk and release blockers
1. Legacy login sessions may return null currentLevel. This candidate deliberately denies non-MFA sessions with null currentLevel, which could cause user lockouts without additional approved compatibility work.
2. Immediate masking on same-UID refresh/resume can cause visible blocking or loops. Verify mobile UX, resume, network failures, repeated TOKEN_REFRESHED events and sign-out concurrency with real browsers.
3. Verify the existing login.html?mfa=1 challenge works across email, username, Google and recovery login, and that protected backend operations require AAL2 where necessary.
4. Real signed owner-controlled dual-user Staging tests are mandatory. Synthetic CI is not actual Auth, RLS, finance or Vault acceptance.
5. Do not edit production app.html until a separately scoped owner authorization and coordination with parallel Landing/finance development. Recheck latest main before patching; preserve app.html, finance source, cache version and rollback snapshot.
6. Keep the previously platform-blocked Staging QA retirement and legacy two-argument Vault guard restricted. This branch cannot bypass those release gates.

Status remains DRAFT, REVIEW ONLY, UNMERGED until all gates pass.