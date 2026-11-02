# N10 — fixed recovery key viewing (isolated feature review)

**Date:** 2026-11-02  
**Base main:** `59f7acb04c69471c91c4678497c3972d46ce7cd0`  
**Status:** REVIEW ONLY — NO MERGE, NO DEPLOYMENT, NO DATABASE CHANGE.

## Existing functionality preserved
- Existing login, username binding, phrase verification, MFA and Password & Devices remain untouched.
- Draft PR #2, #11, #33 and composite PR #37 stay separate; never bulk-merge these sources.
- This branch changes **only** independent N10 review source/tests/documentation; not `app.html`, `login.html`, Landing, SEO, PWA, finance or database records.
- **Reuse** the existing draft PR #2 Glass UI (`feature/n10-fixed-recovery-key-modal-20261031`, `js/mmhvault-n10-a7-83-security-center.js`) instead of rebuilding it. The PR #2 copy is conflict-prone and has a hard-OFF `N10_FIXED_VAULT_UI_RELEASED=false` gate. Do not merge the original PR wholesale; a later approved integration should transplant only the audited Recovery Key elements into the latest, concurrently updated Security Center.

## Required fixed-key behavior
1. For a username-only account with an **encrypted backup of the original words**, show a password-authenticated `View original Recovery Key` action in Settings → Password & Devices → Recovery Key.
2. The **server**, not browser claims, must verify the exact signed account owner, a currently active session, current login password, current MFA factor/AAL (if enrolled), and matching encrypted Vault ownership. Rate-limit requests.
3. Only return the saved **original** ten words after all checks. Keep words in transient UI memory only; automatically hide within 45 seconds and immediately on sign-out, account switch, closing the dialog, pagehide or backgrounding.
4. No `generate`, `reset`, `replace` or `rotate` action exists in the viewing flow.
5. **Legacy account with verifier only and no encrypted backup:** the original words cannot be recovered from the one-way verifier. The UI must say so; **do not generate or replace anything** and never falsely claim the original words were found.

## Supabase / Auth / RLS impact assessment
**Current change: ZERO runtime impact.** This branch contains only disabled standalone review files and local tests. No Supabase schema, Auth config, Edge function, JWT setting, secrets, RLS, user account or financial record is edited.

**Before any future production integration:** the isolated Vault proposal in PR #11 needs a separate authorization and verified staging schema-drift review, a safe per-owner encrypted backup path during *new* username signup, owner-only privileged RPC access, failure-rollback evidence, two-account signed AAL1/AAL2 checks, revoked-session checks and backout plan. Staging currently has a legacy two-argument session guard; production does not have the N10 Vault RPCs. Do not replay the stale initial-install SQL in staging.

## Isolated transport contract added in this branch
- `security/n10-recovery-view/recovery-transport.mjs` has an OFF-by-default release gate; it is NOT imported by any active website file. The allowed API endpoint is fixed, the two actions are strictly `status` and `reveal`, and the browser will never call `backup_existing`, `replace`, or rotation actions through this transport.
- Before any request, verify that the current Auth user ID matches the session user ID; use only a signed bearer for the pinned Edge endpoint. Browser checks are not a replacement for backend Auth/MFA/session checks.
- For status, do **not** send a password. For viewing, send only the current password, omit cookies and referrer, forbid redirects, bound received JSON, and sanitize response fields. Never store words/passwords in localStorage, sessionStorage or analytics.
- The Edge backend candidate in Draft PR #11 is **not deployed**. Its `reveal` action will be unavailable until an audited private Vault is ready, real signed two-owner tests pass, and a separate release is approved. This browser transport does not create Vault secrets or recover legacy HMAC-only words.

## Test and release criteria
- Pure UI controller checks: status, wrong password and retry, MFA error, revoked session, nonexistent backup, malformed response, 45-second hide, race against account switch/close, EN/ZH/MY error text.
- Unit tests are synthetic and **do not** prove actual signed Auth or Vault encryption.
- Do not merge to `main` until fresh main SHA, changed-file scope and non-overlap with parallel APP V11 and Landing branches are verified, and the owner explicitly approves a scoped release.

## 2026-11-02 further privacy hardening (review-only)
- The transport rechecks the **same current owner and exact session token** after the bounded Edge response and before returning the original phrase, blocking logout, account-switch and token-rotation races. The server must still enforce Auth, MFA, revocation and Vault ownership.
- The controller fails closed if an on-screen render callback or hide timer throws, clearing the sensitive state before reporting a generic error.
- `recovery-view-lifecycle.mjs` is a standalone **NOT LOADED** adapter for the existing N10 Recovery Key Glass modal: it clears visible words when the document goes into the background, the page unloads, an existing modal close button is clicked or Auth changes. It unsubscribes and removes listeners on teardown. There is **no production import, UI activation, or database change**.
- Matching offline tests cover those race conditions, renderer exceptions, timer failure and lifecycle events; only six extra isolated-source commits have been added since the previous review gate.
- **Do not** interpret synthetic success as successful real signed two-owner MFA/AAL2, encrypted Vault read or a deployed integration. The login/recovery endpoint and Vault schema are still separate release gates.

## 2026-11-02 — API contract reconciliation and live schema audit

**GitHub-only development; no deployed feature.** Read-only schema metadata confirms:

| Environment | Vault RPCs | Live session checker |
| --- | --- | --- |
| Staging `ldivswlhtgmznzwhzsoi` | `backup_put`, `backup_get`, `backup_exists`, `take_attempt` exist | **Legacy 2-argument** `(uuid, uuid)` |
| Production `vrypucmyrztxgiqhjspd` | **No N10 recovery Vault RPCs** | **No N10 recovery session checker** |

The Draft backend in PR #11 **requires a 3-argument `(uuid, uuid, text)`** owner/session/AAL check. The existing Staging RPC cannot safely be reused as a substitute. **Do not execute the PR #11 first-install SQL on top of the existing Staging schema.** A separate versioned upgrade, explicit approval, signed AAL2 QA and rollback verification are mandatory.

### Frontend/backend interface check
- Source pinned: `security/n10-fixed-recovery-vault-candidate/index.ts` in Draft PR #11; browser source pinned in Draft PR #43. Expected Edge URL, `status` response `backup_status/backed_up` and `reveal` response `recovery_key/words/expires_in_seconds=45` agree.
- Browser now rejects `recovery_key` on `status`, rejects `backup_status` on `reveal`, requires JSON content type, verifies the specific bearer with Auth `getUser(access_token)`, and rechecks the same session and bearer after the awaited response.
- The Vault `backup_put` candidate rejects replacing a **different** stored phrase and accepts the same original phrase idempotently. This is candidate-source logic, **not verified production behavior**.
- This viewer never calls `backup_existing`, replacement, reset or key generation. The existing PR #2 recovery UI is hard-OFF and must not be bulk-merged.
- New username registrations still require a **separately approved first-time encrypted escrow of the phrase actually generated at signup**, before declaring recovery viewing available. Simply keeping a one-way phrase verifier cannot satisfy original-word re-view for a lost key. Future registration changes must protect existing accounts and finance data, and require independent staging review before any deployment.

### Security limitations
- The browser's `getSession()` reads local session state; it does **not** independently authorize Vault access. `getUser(access_token)` authenticates the bearer, but only the backend, current server session, MFA/AAL and Vault owner checks can authorize disclosure.
- Synthetic CI does not constitute real two-account, MFA, revoked-session, plaintext exposure, signup escrow or encryption-at-rest acceptance.
