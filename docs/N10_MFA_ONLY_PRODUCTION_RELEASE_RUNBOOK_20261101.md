# MMHVAULT N10 — MFA-only controlled release runbook

**Prepared:** 2026-11-01. **Status: REVIEW-ONLY / RELEASE BLOCKED pending real signed MFA acceptance and explicit production approval.** Nothing in this runbook authorizes a merge, toggle, bypass, or deployment.

## Live audit basis
- Production repository: `myintmoehein0115024/MMHVAULT`, `main` `d9e61e96d9ea30f1296d81594f87275179c85c3e`.
- [Independent MFA safety PR #9](https://github.com/myintmoehein0115024/MMHVAULT/pull/9): `review/n10-mfa-only-20261101` → `main`, Draft, not merged, reported GitHub `mergeable=true`, 0 commits behind main as of this audit. The state and HEAD must be refreshed just before any future merge.
- Latest successful **isolated** CI: [run 41283929111](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41283929111). Candidate tests: **16/16** source/synthetic contracts, **38/38** Chromium/WebKit simulated browser checks, **2/2** browser tests using the actual account security DOM extracted from `app.html`.
- **Actual diff:** `js/mmhvault-n10-a7-83-security-center.js`, three independent synthetic/source tests, one review-only CI workflow, one review report; this runbook will be a seventh review-only file. `app.html` has not been changed.
- **Not a feature enablement:** `const N10A790_TOTP_ENROLLMENT_RELEASED=true;` exists in **both** current production `main` and PR #9. Neither branch contains the fixed-recovery Vault API or Vault release flag. PR #9 repairs pending-factor cleanup, owner/epoch guards, AAL2 and factor confirmation, stale original ten-word responses, and account/factor UI refresh.
- Production `app.html` references `js/mmhvault-n10-a7-83-security-center.js?v=10.790.1`. The Auth client and QR vendor library initialize before this security JS. `mmhA783TotpBackupConfirmed` is intentionally dynamically rendered by the JS. Do **not** duplicate it as a static HTML field.
- Branch protection rules were not readable via connector (GitHub returned HTTP 403); don't claim protected-branch conditions have been verified.

## Gate A — REAL Staging signed MFA acceptance (BLOCKED)
**Known server-side record:** Staging project `ldivswlhtgmznzwhzsoi`, existing synthetic account A has **one `totp/unverified`**, zero `verified`; B has no TOTP factors. A real fresh signed AAL2 session has not been demonstrated for that exact A factor.

Independent MFA QA page remains `QA_RELEASED=false` / expired, and a previous attempted activation was rejected by a safety mechanism. **Do not route around that rejection** using a different page, branch, platform, API, role or alternate implementation. Neither a prior UI-reported PASS nor mocked `aal2` proves the server-side factor is verified.

Proceed only after that activation restriction is resolved through the same authorized security/governance mechanism, followed by a separately scoped owner-approved Staging MFA test window and a rollback plan. The exact pass evidence is: server-side factor with `status='verified'` for A; a fresh signed Auth session with current `aal2`; AAL1 denial when second factor is required and AAL2 acceptance on the same protected operation; safe signout/revocation behavior. Evidence reports **counts/status only**, never recovery words, QR, OTP, access tokens, passwords or private finances.

**Until Gate A passes, PR #9 stays Draft and unmerged; do not declare production MFA ready.**

## Gate B — separate minimal production release (NOT YET AUTHORIZED)
Gate B is possible **independently of fixed-recovery Vault E2E** because PR #9 does not ship that feature. Once Gate A passes, perform these controls sequentially with an explicit owner approval for this exact release:

1. **Recheck baselines:** current `main` commit, PR #9 head, GitHub review/mergeability/CI, and exact diff. Resolve new changes while preserving Login, Landing, Accounts FX, mobile PWA, financial RLS and financial data; do not use a wholesale overwrite.
2. **Rollback resources:** export the owner's current finance data; retain the complete latest `main` snapshot and original `js/mmhvault-n10-a7-83-security-center.js` plus `app.html`. Record original script blob `7a7f69b3aa4c3ec8f68f5032d7b3ace75c912911` and `app.html` blob `cbce6ff2d78527ca393c2b837dc0e7ac2b601f1a` from the current audit (these may change). Never expose auth/recovery secrets in the backup.
3. **Deploy the minimum:** review & merge only the approved MFA-only patch from PR #9. As part of the **same coordinated production release**, bump the security JS cache token in the then-current `app.html` from `?v=10.790.1` to a **new version**; do not guess that updating the JS file alone purges PWA/browser caches. The static `app.html` version change must be explicitly included in the scope and applied carefully against latest main; do not change it early.
4. **Post-deploy acceptance:** inspect GitHub Pages/production deployment completion and actual served `app.html` + versioned JS. With **authorized owner-controlled** accounts only, test username/email/Google sign-in, MFA verified and unverified states, original ten-word verification, QR lifecycle, mobile/desktop modal, logout/account switch, and ability to reach Dashboard, Accounts, Transactions, Analyze. Check Accounts FX and balances remain consistent and no financial data was migrated.
5. **If any regression:** halt release, preserve non-sensitive evidence, revert the **specific release** and matching cache query to the known-good baseline using the version-appropriate rollback procedure; recheck authentication and finance. Do not disable RLS, reset production keys or drop user data to make testing pass.

## Gate C — fixed-recovery Vault (SEPARATE / STILL BLOCKED)
The old Draft PR #2 remains merge-conflicted and contains **unreleased Vault candidate** code; the Staging joint Vault Edge and independent QA remain OFF. The new encrypted fixed-recovery Vault has **not** passed owner isolation, signed AAL1/AAL2+Vault, restore/reveal, revocation and safe deletion/orphan-free testing. Do not deploy or merge Vault as part of the MFA-only release. Its security, backend and final release approval are separate and can happen later.

## Current operational decision
- **PR #9 code ready for review, but not approved to ship.**
- **Production changes performed in this task: NONE.**
- **QA/Edge changes performed in this task: NONE.**
- **No further amount of synthetic tests clears Gate A.** The practical next move is an authorized, non-circumventing resolution of the previously blocked QA activation. If that cannot be obtained, hold this PR in Draft and continue unrelated work.

## 2026-11-01 — concurrent main recheck (supersedes older baseline counts)
- Main advanced to `8ea0673378efcf6120675d399429593517e604c8` after the earlier runbook was written. The latest GitHub comparison shows PR #9 **25 ahead, 2 behind** main; the common base remains `d9e61e96d9ea30f1296d81594f87275179c85c3e`.
- Changed paths remain **seven**: the Account Security JS and six review-only CI/docs/test paths. No PR-side change to `app.html`, `login.html`, Landing, financial source or business pages. Main's two intervening commits must be preserved at release; do not blindly merge/rebase.
- Latest production Security JS blob observed `7a7f69b3aa4c3ec8f68f5032d7b3ace75c912911`; candidate blob `bd618984539db1e49a531ff7a834dac71f3d9a83`. The candidate contains account-epoch and refresh queue guards absent in the current production script, but real Staging signed AAL2 still has no accepted evidence.
- Older statements in this runbook such as `0 behind main` or the old baseline SHA are historical snapshots. The release gate and no-deploy decision remain unchanged.

## 2026-11-01 — lost-device recovery readiness (review only)
- User-facing security guidance (MFA-only review branch): initial setup asks owners to configure the same TOTP QR on a second trusted device **or** securely preserve the manual setup secret before activation. Enabled-factor and AAL1-pending screens clarify that the original ten-word username recovery key **does not bypass** the six-digit authenticator step. English/Chinese helper strings and isolated browser/source tests are included. The current AAL2 protection, verification and factor-removal checks stay unchanged.
- **Known limitation:** if the user's *only* working authenticator and every backup/setup-key copy are lost, MMHVAULT currently has **no approved self-service MFA recovery flow**. Email resets, Google login, ten-word recovery, possession of a prior login session, or a support ticket must **not** be interpreted as permission to silently unenroll factors or issue an AAL2 session.
- An optional future account-recovery feature would require an independently reviewed threat model, high-assurance identity proof and explicit audit/notification/cooldown rules, safely scoped factor reset and full live owner-isolation/anti-takeover tests. This is a **separate proposal**, not implemented or approved in this PR.
- Future authorized acceptance must include scanning one enrollment QR on two separate authenticator devices and demonstrating that each device can generate a working code on the same account, without using real secrets in bug reports. Confirm the 10-word key alone does not satisfy a pending AAL2 challenge; test logout, phone replacement, deliberate factor removal and no unintended account lockout.
- No new QR persistence, secret export, bypass route, second-factor enrollment, service-role operation, Auth configuration, Staging QA activation or production release has been added. This PR remains Draft and unmerged.
