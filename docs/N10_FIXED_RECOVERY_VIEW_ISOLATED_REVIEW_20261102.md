# N10 — fixed recovery key viewing (isolated feature review)

**Date:** 2026-11-02  
**Base main:** `59f7acb04c69471c91c4678497c3972d46ce7cd0`  
**Status:** REVIEW ONLY — NO MERGE, NO DEPLOYMENT, NO DATABASE CHANGE.

## Existing functionality preserved
- Existing login, username binding, phrase verification, MFA and Password & Devices remain untouched.
- Draft PR #2, #11, #33 and composite PR #37 stay separate; never bulk-merge these sources.
- This branch changes **only** independent N10 review source/tests/documentation; not `app.html`, `login.html`, Landing, SEO, PWA, finance or database records.

## Required fixed-key behavior
1. For a username-only account with an **encrypted backup of the original words**, show a password-authenticated `View original Recovery Key` action in Settings → Password & Devices → Recovery Key.
2. The **server**, not browser claims, must verify the exact signed account owner, a currently active session, current login password, current MFA factor/AAL (if enrolled), and matching encrypted Vault ownership. Rate-limit requests.
3. Only return the saved **original** ten words after all checks. Keep words in transient UI memory only; automatically hide within 45 seconds and immediately on sign-out, account switch, closing the dialog, pagehide or backgrounding.
4. No `generate`, `reset`, `replace` or `rotate` action exists in the viewing flow.
5. **Legacy account with verifier only and no encrypted backup:** the original words cannot be recovered from the one-way verifier. The UI must say so; **do not generate or replace anything** and never falsely claim the original words were found.

## Supabase / Auth / RLS impact assessment
**Current change: ZERO runtime impact.** This branch contains only disabled standalone review files and local tests. No Supabase schema, Auth config, Edge function, JWT setting, secrets, RLS, user account or financial record is edited.

**Before any future production integration:** the isolated Vault proposal in PR #11 needs a separate authorization and verified staging schema-drift review, a safe per-owner encrypted backup path during *new* username signup, owner-only privileged RPC access, failure-rollback evidence, two-account signed AAL1/AAL2 checks, revoked-session checks and backout plan. Staging currently has a legacy two-argument session guard; production does not have the N10 Vault RPCs. Do not replay the stale initial-install SQL in staging.

## Test and release criteria
- Pure UI controller checks: status, wrong password and retry, MFA error, revoked session, nonexistent backup, malformed response, 45-second hide, race against account switch/close, EN/ZH/MY error text.
- Unit tests are synthetic and **do not** prove actual signed Auth or Vault encryption.
- Do not merge to `main` until fresh main SHA, changed-file scope and non-overlap with parallel APP V11 and Landing branches are verified, and the owner explicitly approves a scoped release.
