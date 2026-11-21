# MMHVAULT N10 — Staging AAL2 session guard installation report

**Date:** 2026-11-02 • **Environment:** Staging ONLY `ldivswlhtgmznzwhzsoi`  
**Approval:** user explicitly authorized the Staging-only additive MFA/session verification interface and controlled QA. **No production release or merger approved.**

## Actions completed

- Checked GitHub `main` and N10 Draft PR #2, #11, #37, #43, #50, #52. Based independent feature branch on `main` at `76877961cbc4fd79753f469246d724ec19f99aca`.
- Read-only migration preflight checked the deployed legacy function, its exact source fingerprint, Vault private schema and permissions, Auth session/MFA fields, and missing new overload. All checks passed.
- Installed **ONE new** `public.mmh_n10_recovery_session_active(uuid,uuid,text)` overload through the Supabase `apply_migration` tool, **project ID pinned to Staging**, using `docs/sql/n10_staging_aal_v2_APPROVED_INSTALL_20261102.sql`. Supabase replied `success: true`. Migration history confirms `20261102122942 n10_staging_recovery_session_aal_v2_20261102`.
- The migration is an **atomic DO statement**: fail-closed drift checks; only `CREATE FUNCTION` of a new overload plus `REVOKE`/`GRANT` on that new overload. Any exception rolls back all of it. No migrations from older first-install files were replayed.
- No Auth user, session, MFA factor, Vault secret, Recovery Key, username link, financial record or other existing table row was edited. No Edge function or release switch was deployed/toggled.

## Observed post-install results — confirmed with SELECT-only Staging queries

| Item | Result |
| --- | --- |
| Legacy two-argument session function | Present, unchanged; MD5 `a9aff9c940d74a7a35134f84929334fd` |
| New three-argument AAL function | Present; MD5 `dcea7947bdd72710e17df4a072f96d8f` |
| Both functions' SECURITY DEFINER and `search_path=''` | Confirmed |
| `anon` and `authenticated` EXECUTE on both | Denied |
| `service_role` EXECUTE on both | Allowed |
| Five nonexistent/malformed owner/session/AAL scenarios | All returned FALSE |
| Staging username-only dedicated accounts | 2 (unchanged) |
| Staging account sessions examined | 5, all AAL1 |
| AAL1 actual session predicate | 5/5 allowed |
| AAL2 predicate on those AAL1 sessions | 0/5 allowed |
| Cross-owner session checks | 5 tested, 0 allowed |
| Encrypted backup records / rate bucket records | 0 / 0 (unchanged) |
| Read-only schema readiness | `SCHEMA_PRECHECK_OK__SIGNED_TWO_OWNER_MFA_QA_STILL_REQUIRED` |

**Meaning:** The installed database function passed *schema and controlled SQL predicate tests*. It did **not** prove any real signed bearer token, login-password re-auth, encrypted ten-word retrieval, MFA AAL2 success, live sign-out revocation, or two-owner full browser/Edge end-to-end flow.

## Important restrictions still in effect

- Production `vrypucmyrztxgiqhjspd` remained **entirely untouched**. Do not apply this Staging migration there.
- Draft PR #11's Vault Edge candidate remains disabled and not deployed; existing Staging QA Vault feature flags remain unchanged.
- Draft PR #43's UI/transport remains OFF and unhooked; Draft PR #50's signup escrow is only synthetic code. Old HMAC-only Recovery Keys cannot be recovered from passwords; do not invent replacement words.
- Production rollout is **NOT APPROVED**. The next stage is isolated signed two-owner AAL1/AAL2 MFA, wrong-password, revoked-session, cross-owner and Vault ownership testing, requiring suitable synthetic QA identities and explicit separate authorization for any additional Staging writes.

## Rollback plan (documentation only; NOT executed)

If a confirmed problem emerges, block Vault access first, identify dependent callers, and **obtain explicit approval for a rollback**. Verify the newly created overload still has fingerprint `dcea7947bdd72710e17df4a072f96d8f`, the legacy fingerprint remains unchanged, and no new caller depends on the overload. Then remove **only** the new `public.mmh_n10_recovery_session_active(uuid,uuid,text)` signature in a Staging-only controlled transaction; verify the legacy `(uuid,uuid)` function, four Vault RPCs, privacy tables and all user records persist. No rollback was needed for this installation.

## Audit scope

This branch stores only this report, the exact Staging-only migration SQL, read-only postcheck, tests and nondeploying GitHub CI. No shared `app.html`/`login.html`, public pages, SEO, APP V11, financial data, or active N10 Auth implementation files are modified.

## Post-install Staging Edge read-only confirmation

Read-only inspection of the deployed Staging `mmh-n10-qa-joint-mfa-vault-20261101` (v1) showed `RECOVERY_RELEASE_ENABLED=false` and a default expired QA window (`1970-01-01T00:00:00.000Z`). Its source still calls the legacy two-argument session guard. The installed new three-argument guard is therefore **not yet consumed by the locked Staging QA Edge**. This is expected: no Edge deployment or release-switch change was authorized in this Staging-only database step. A separate approved QA Edge update plus real signed MFA owner tests is needed before reporting full E2E success.
