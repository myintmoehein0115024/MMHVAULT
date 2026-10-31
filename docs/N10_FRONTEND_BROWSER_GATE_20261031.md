# MMHVAULT N10 — Frontend login regression gate (2026-10-31)

**Status:** PASS for offline/mock browser regression; production launch NOT authorized.

## Code hardening in this round
The feature branch `login.html` now rejects absent, null, malformed or unknown **next** MFA assurance levels before any redirect to `app.html` or another private page. It also rejects unknown current levels, while permitting `currentLevel=null / nextLevel=aal1` for verified legacy sign-ins without MFA. Enrolled AAL1 requires the independent authenticator overlay, and only verified AAL2 can continue. Remote Auth UID must match the cached session UID.

## Tests / evidence
GitHub Actions run `41186009948` completed **36/36 Chromium tests PASS** with two responsive viewports (390×844 and 1440×900), alongside successful static safety checks.

The current browser suite verifies:
- Unified Email or Username field and separate Google entry.
- Valid email password login, unknown MFA assurance fail-closed behavior, enrolled AAL1 MFA challenge, and null legacy AAL1 no-factor access.
- Distinct remote/cached account identities refusing navigation.
- Username-only server credential exchange and Auth `setSession` handoff; mismatched remote UID triggers local sign-out and never navigates.
- Google OAuth called with an actual callback URL rather than a simulated logged-in session.
- Password reset is offered only for valid email; bare usernames are directed to recovery-key flow.
- Ten-word recovery backup and recovery login dialogs at both breakpoints.
- MFA challenge code errors, session mismatch, sign-out failure and successful simulated verified redirect, with overlay retention on failure.
- Private recovery words do not require production network for browser QA.

**Limitations:** The browser suite uses intercepted synthetic Auth, CAPTCHA and Edge responses. It does NOT prove that a live Google OAuth callback, live username registration, password reset email, account linking, multi-device browser storage, actual financial transactions or production wallet RPC works after deployment. The isolated Staging JWT/RLS/RPC/Storage/Edge real-token matrix did pass 17/17 separately, but targets purpose-built QA objects rather than deployed production policies/functions.

## Next release gates
1. Review the combined frontend changes including `app.html` private signed URL TTL and login redirect logic, and confirm no breaking integration with authenticated settings/profile/account data.
2. Carry out scoped production-like tests of actual privileged wallet and Edge paths with synthetic data only; verify signed URL issuance and caching.
3. Confirm GitHub `main` baseline/rollback snapshot, Supabase function bodies/policy rollback, explicit change window and rollback owner before any production write.
4. After separate explicit production authorization, execute a controlled deployment and check the post-release read-only gate; do not change financial rows.

**Current production status:** PR #1 remains Draft/unmerged. No production site, database, RLS or financial data writes were made in this round.
