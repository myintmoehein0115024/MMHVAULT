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
