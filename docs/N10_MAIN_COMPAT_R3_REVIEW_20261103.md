# MMHVAULT N10 — current-main compatible account-security review R3

**Draft review only. No merge, no release, no production deployment, no Supabase changes.**

## Pinned baseline and scope

- Created from GitHub `main` commit `475cf72be82718db01b25ba57b7d21f191278a44` on 2026-11-03.
- Old N10 PR #2 (`feature/n10-fixed-recovery-key-modal-20261031`) is still Draft, merge-conflicted, and must **NOT** be merged wholesale.
- `login.html` is byte-identical between latest main and PR #2, Git blob `89fac1d3a6ff0b8415d557707b8c953166591d53`. In particular, the left/right recovery/forgot links and password-reset flow already exist in main. **Do not rewrite or touch login.html.**
- The current-main security-center script before this review was Git blob `7a7f69b3aa4c3ec8f68f5032d7b3ace75c912911`. The PR #2 candidate script is Git blob `3834544fb65ba2dc79d488edd3c91ef9a4d3468b`; the latter is **identical** to the previously tested isolated R2 review script.
- R3 replaces **only** `js/mmhvault-n10-a7-83-security-center.js` on an isolated branch, and adds independent synthetic tests and CI. Nothing is merged or enabled in main.

## Candidate behavior under review

1. Fixes asynchronous MFA setup and removal races with modal-state, account-owner and verification checks. The candidate avoids showing QR/secret information after the modal is closed, account switched, or document hidden.
2. Ensures encrypted recovery-key viewing is hidden behind `N10_FIXED_VAULT_UI_RELEASED=false`, with a separate server-side release gate. Never infer authorization from a browser flag. Production Vault deployment remains **unauthorized and absent**.
3. Maintains the historical one-way recovery-key rule: if only an irreversible verifier exists, original words cannot be reconstructed; never silently replace the user's permanent key.
4. Enforces secret hiding and clearing, MFA assurance checks, and fail-closed behavior when Auth state is stale. Static/browser simulations are not a substitute for signed-token or production tests.
5. Does not change `login.html`, `app.html`, Landing, SEO, the finance system, deployment configuration, SQL schema, RLS, Auth settings, or any existing user data.

## Latest Staging results, separate from this integration candidate

- As of 2026-11-03, authorized Staging accounts A and B each completed a real MFA AAL2 + individual synthetic recovery-key generation/encrypted backup/password reveal flow.
- B first reported no backup while A's backup existed. This establishes separately owned backup-status visibility, **not** an adversarial B-to-A read attempt.
- Subsequent Staging database checks showed for each account: one verified TOTP, one fixed verifier, one encrypted backup.
- Staging joint Vault Edge was rolled back to hard-OFF **v11** with `verify_jwt=true`, expired 1970 deadline and empty QA allowlist. The R3 candidate does not deploy any Edge or reopen testing.

## CI and release gates

- `security/n10-main-compat/test-ui-secret-guards.mjs`: synthetic source/secret and MFA state-machine checks.
- `security/n10-main-compat/test-browser-mfa-smoke.mjs`: independent Chromium and WebKit synthetic UI regression checks. No live credentials or Vault traffic.
- `.github/workflows/n10-main-compat-review.yml`: parse and run both suites, read-only permissions, no deployment.
- Before a Production release: pass CI on final head, recheck latest main and conflicts, review current actual client/backend Auth integration and untested cross-owner denial/race cases, run controlled signed Staging QA, and request explicit Production approval. Do **not** merge this Draft simply because offline checks are green.

**Status:** isolated compatibility candidate only. `main` and the formal Production website remain unchanged.
