# MMHVAULT N10 — MFA-only security hardening candidate

**Prepared:** 2026-11-01 (Thailand time). **Status: ISOLATED REVIEW / NOT DEPLOYED / NO PRODUCTION APPROVAL.**

## Branch / exact baseline

- Isolated branch: `review/n10-mfa-only-20261101`
- Forked from **main** commit `d9e61e96d9ea30f1296d81594f87275179c85c3e`
- Main Account Security source blob at fork: `7a7f69b3aa4c3ec8f68f5032d7b3ace75c912911`
- MFA-only candidate Account Security blob: `2e30cf19b6bac15b4824dfe1d954129905094f7c`
- Independent GitHub Actions: `https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41277627418` **SUCCESS**.

## Scope: exactly four changed files
1. `js/mmhvault-n10-a7-83-security-center.js` — port only previously reviewed MFA lifecycle, owner, factor and AAL2 checks.
2. `security/n10-mfa-only/test-mfa-isolation.mjs` — 12 local static/synthetic contracts and a guard proving Vault code is **absent**.
3. `security/n10-mfa-only/test-browser-mfa-smoke.mjs` — 20 headless Chromium + WebKit checks with a local fixture and fake Auth.
4. `.github/workflows/n10-mfa-only-review.yml` — push-triggered isolated CI, read-only checkout, local tests only. No GitHub Pages deployment.

No changes to `main`, `app.html`, `login.html`, Landing/SEO, Accounts FX, financial transactions, PWA, production Auth settings, database, RLS, Edge Functions, Secrets or DNS.

## Specific MFA-only hardening
- Use `auth.mfa.listFactors().data.all` to find **unverified** TOTP entries; the `totp` subset is verified-only. Reject missing or unknown factor inventory and preserve existing verified factors.
- Clear stale unverified TOTP factors and re-read server inventory before new enrollment; use a unique display name.
- Pin pending factor ID to Auth-verified user ID; before cancel remove only the **same owner's unverified** factor.
- Use request epoch, current owner, foreground state and active modal checks so delayed responses after logout, account switch, tab hide or modal close cannot revive QR or falsely report success.
- Before reporting successful binding, confirm `mfa.verify`, Auth current AAL2 **and** an exact matching `verified` TOTP factor.
- Destructive verified-factor removal requires a fresh confirmed Auth owner, active modal/typed confirmation, AAL2 and an unchanged, matching verified factor ID.
- Synchronously clear transient TOTP and existing original-recovery UI on sign-out and account change, including while `busy` blocks refresh.

## Explicitly excluded (not silently replaced)
- **No fixed-recovery Vault integration:** no `VAULT_API`, `vaultApi`, `N10_FIXED_VAULT_UI_RELEASED`, new password/escrow fields or backup/reveal actions.
- **Original permanent ten-word verification endpoint and 60-second display remain unchanged;** narrow new stale-response rejection and fail-closed QR-error cleanup are covered in the addendum below. Existing login methods are untouched.
- No production Edge deployment or database migration; the separate Vault Draft remains independently OFF and untested.

## Test results — simulated evidence only
- `node --check`: PASS.
- 12/12 source/synthetic MFA-only contracts: PASS.
- 20/20 actual headless Chromium + WebKit local synthetic browser checks: PASS (QR stale response, background invalidation, logout/recovery wipe, A→B account switch, AAL1 false-success refusal, unverified-factor false-success refusal, 320/390 px modal width, Escape dismiss).
- Test fake `db.auth` and fake `fetch` cannot reach real Supabase; browser requests outside local fixture are blocked. **Not a signed-token AAL2, backend, iPhone Safari, or complete production-app layout acceptance.**

## Remaining independent release gates
1. **Authoritative Staging A MFA** is still unverified (one TOTP `unverified`, zero `verified`); QA is LOCKED and activation was safety-denied. No bypass or workaround under another route. Require a separately permitted, authentic signed MFA/AAL2 pass before announcing release readiness.
2. **Vault joint MFA + recovery + deletion E2E** is not verified. It is separate from this candidate; Staging joint Edge OFF/expired, production Vault not deployed. Do not merge Vault merely to release MFA.
3. **Production approval / merge** is independent: verify exact fresh `main` SHA, inspect the minimal candidate diff, re-run CI, preserve newer unrelated code, obtain explicit scoped approval and rollback/backup strategy. Existing PR #2 remains **Draft / mergeable=false** and must not be merged automatically.

**Conclusion:** MFA-only patch is ready for further review and authorized signed testing, **not for uncontrolled production activation**. No user action is required now.

## Additional original-recovery async safety review (2026-11-01)
- Read-only source review found a specific **original 10-word recovery** UI race in the prior isolated MFA-only candidate (and its unchanged production-main baseline): `mmhA783KeyVerify` awaited `api('verify_saved_phrase')` and then displayed the words without checking whether the modal was still open, the user had signed out/switched accounts, or the page had been backgrounded. This is a **candidate source-level risk**, not proof of a production exploit. The production source was not modified.
- The isolated review branch now introduces `recoveryEpoch` invalidation within `hideKey()`, a guarded `recoveryRequestActive(epoch,userId)` requiring same owner, epoch, foreground state and visible modal, and clears any prior words **before** awaiting the request. Late responses are discarded and cannot recreate the word list or QR after closure/account change. A missing modal overlay also fails closed. If QR rendering throws after successful Auth verification, the catch path now reliably clears DOM secrets.
- Existing original-recovery UX remains: original phrase verification API, 10-word display and **60-second auto-hide**; this is a narrow async safety change. No fixed-recovery Vault code, backend schema, escrow/reveal API, passwords or secret migration was added.
- Code commits `34aa9568930e83d01509635d095758a5b5e35cd5`, `4947aa435c64546e81fe6d0d4a84b1e4cdb7d1e5`; dedicated tests `b791abc9c9fe290446191817bd888048b113a74d`, `381d43ad698ae697a30a7c09c64ac46ddc0c5bff`, `33d2821caeb7e5f22b85053df9d8bf4d9b827f8c`, `7b452b3e674dbd994c5bea031816139bdac95086` and `2a56132589b7c0cb3731769c35ccd1955a609ea5` (some intermediate source-pattern assertions failed until updated).
- **Authoritative latest candidate-code CI `41280764187`: SUCCESS** — JS syntax PASS; **14/14** MFA-only static/synthetic tests; **32/32** local browser tests (16 Chromium, 16 WebKit). Synthetic delayed Auth response tested after sign-out, A→B switch, modal close and hidden/foreground roundtrip. Original normal 60-second view and QR rendering error cleanup tested independently. Mocked Auth and local HTTP fixture only; no live Supabase, real recovery key or real signed user tested.
- Unchanged release gates: Staging A TOTP remains last recorded `unverified`; production `main` is unchanged; QA remains LOCKED; Vault joint Edge OFF; PR #2 Draft/unmerged. This candidate has no authorization for production deployment.

## Session-switch and queued refresh race guard (2026-11-01)
- **Issue found in code review:** account-status `refresh()` used `if(busy)return`, which could permanently omit a refresh triggered by `SIGNED_IN` while MFA actions were busy. An earlier A status/failed response could also repaint B's account information or show an outdated session error after SIGNED_OUT.
- **MFA-only isolated branch fix:** `authEpoch` invalidates in-flight account-status requests on `SIGNED_IN`, `SIGNED_OUT`, or `TOKEN_REFRESHED`; `refreshNonce` rejects older responses even with overlapping refresh requests. Auth changes that occur while `busy=true` queue `refreshPending`, which is replayed by `releaseBusy()` after each security action finally releases busy. Stale error handlers also fail closed without clearing a newer user's UI.
- Browser synthetic regressions in Chromium and WebKit: switch A→B while A's status request is delayed, verify B's status remains intact when A's response finally returns; verify late failed A status cannot replace the signed-out message; verify B refresh eventually completes when an old A enrollment kept the panel busy. **No real account/session or production endpoint** was exercised.
- Last verified Actions `41282554424` **SUCCESS**, `node --check` PASS, **16/16** MFA-only source/synthetic guards and **38/38** actual headless browser-engine synthetic checks (19 Chromium, 19 WebKit); branch head SHA `65cf4a214f5c72ac14fd2231c4ce956d87ec2d23`. Earlier intermediate CI failure was a static assertion that still expected `if(busy)return`; the assertion was updated for queue behavior and final CI is green.
- PR #9 remains Draft / mergeable=true / unmerged (as checked), and the candidate remained zero commits behind main. QA page still LOCKED/expired, Staging A verified MFA still missing on last authoritative read, Vault remains independently off. **This change is not a signed AAL2 acceptance or production deployment.**

## Actual app.html DOM bootstrap audit and cache release checklist (2026-11-01)
- Audited the complete current `main` `app.html` source (2.7 MB), rather than guessing from the synthetic page. It embeds an Account Security Center and loads `js/vendor/qrcode-1.0.0.min.js` before `js/mmhvault-n10-a7-83-security-center.js?v=10.790.1`. Its main `db` initialization occurs before the security script. Required security form elements are present.
- The production HTML **does not contain a static** `mmhA783TotpBackupConfirmed` checkbox, but this is **intentional and correct**: the security JS dynamically creates the checkbox and bilingual acknowledgement at bootstrap, prior to the Verify & enable action. An initial read of HTML alone suggested a missing control; inspecting the JS corrected that false positive. **Do not add a duplicate field** or weaken the backup confirmation.
- Added `security/n10-mfa-only/test-real-app-dom-bootstrap.mjs` and an isolated CI step; test **extracts the actual Account Security markup directly from local `app.html`**, while remaining external-network blocked and using a **synthetic** Auth object, fake TOTP factor and fake verification response. The two real browser engines assert exactly one dynamic checkbox, correct placement, Chinese and English translations, verification **rejected without checking backup**, and a simulated verified factor reflected in UI after checking backup.
- GitHub Actions `41283777661` at commit `96b99b17016ea5c6b3164392498e9306c92de62a` **SUCCESS**: 16/16 offline source/synthetic checks, 38/38 small-fixture browser smoke checks, and **2/2 actual-app DOM integration checks** in Chromium/WebKit. Total **56/56**. This does **not** execute the entire 2.7MB app with all connected services, a real physical iPhone, signed Staging MFA/AAL2, or the fixed-recovery Vault.
- **Production deployment requirement not yet applied:** `app.html` still references `...security-center.js?v=10.790.1`. When and only when an **independently approved production merge/release** happens, coordinate a **single cache-busting URL version update in the then-current `app.html`** with the candidate JS rollout, with a fresh-main comparison and rollback. Otherwise a returning client may reuse cached old JS after release. Do **not** change `app.html` ahead of release or publish the cached token change independently. This review branch does not modify `app.html`.
- PR #9 remains Draft/mergeable=true/unmerged; branch was 0 behind `main` at last comparison. Staging A verified TOTP/AAL2 is still missing, joint Vault QA remains off, and no QA or production service was activated.


## Recovery word 60-second wall-clock expiry hardening (2026-11-01)
- Isolated MFA-only candidate only: preserved original recovery phrase verification, existing 10-word display and 60-second `setTimeout(hideKey,60000)`; **no new Vault integration** or changes to production `main`.
- Added a distinct `recoveryVisibleUntil=Date.now()+60000` wall-clock deadline on successful verified display. `hideKey()` now clears the deadline when wiping words, QR and input. Foreground `focus`, `pageshow` and visible `visibilitychange` check the absolute deadline, handling sleep/throttled JS timers. The QR export handler also checks expiry before allowing a saved QR.
- Existing sign-out, user switch, modal close, page hide and background events still wipe the words immediately. A deadline does **not** securely revoke any QR already deliberately exported, undo screenshots or guarantee browser RAM is erased.
- Added a synthetic static deadline test and **4 extra local browser scenarios** (two each across Chromium and WebKit) for late foreground resume and expired QR export. The existing browser smoke matrix now reports **42/42**, preserving all earlier checks.
- [GitHub Actions #41300059242](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41300059242) **SUCCESS** at commit `af87fce08579dfc2ef5918d4f7b118dc95d911de`, including JS parse, synthetic MFA/source checks, both browsers and actual production-app DOM bootstrap using mocks. No signed Auth AAL2 QA and no production rollout authorization.


## Same-owner re-sign-in and JWT refresh fail-closed cleanup (2026-11-01)
- During isolated Account Security review, found a source-level edge case: the existing onAuthStateChange cleanup cleared recovery plaintext on SIGNED_OUT and a *different-UID* SIGNED_IN, but not when the same UID authenticated again or the JWT refreshed. These are also authentication transitions; never leave an in-flight recovery response or sensitive factor UI alive across them.
- Changed **only MFA-only PR #9**: when there is a currently bound owner, both SIGNED_IN (including same-UID) and TOKEN_REFRESHED now synchronously hide recovery words, clear pending factor UI, reset sensitive state and collapse security modals, before queuing the normal authenticated refresh. Existing `authEpoch`, `refreshNonce` and `refreshPending` protections remain intact. A sign-out still fails closed.
- Added static callback/epoch assertions and 4 additional synthetic browser acceptance cases (two per Chromium and WebKit) for a pending recovery response after same-UID re-sign-in or refresh. **46/46** local-browser cases completed successfully in [GitHub Actions #41300537908](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41300537908), including mocked app DOM startup; **not signed live Auth QA**.
- Added an explicit allowlist-based `security/n10-mfa-only/test-change-scope.mjs` GitHub Actions guard with full checkout history. It blocks deleted or newly unapproved files and detects any App, login, Landing, Vault, finance or deployment workflow diff. As always, the review branch is independent and behind active Landing changes to main. No merge or production changes.
- The newest branch HEAD with scope guard has a separate CI check; approval of actual signed MFA and independent production deployment remains pending.
