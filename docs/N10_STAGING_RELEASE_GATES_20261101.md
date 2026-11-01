# N10 MFA / Vault — isolated release gates (2026-11-01)

**Status: HOLD. REVIEW ONLY. NO DEPLOYMENT.** Applies to the separate Auth-Staging project only. The production financial application, login files and production project are outside this review.

## Completed evidence (not release approval)
- MFA-only [PR #9](https://github.com/myintmoehein0115024/MMHVAULT/pull/9) is Draft/unmerged. Its isolated synthetic/browser tests previously passed; this is not live signed Auth proof.
- Vault-only [PR #11](https://github.com/myintmoehein0115024/MMHVAULT/pull/11) is Draft/unmerged and has an explicit `RECOVERY_RELEASE_ENABLED=false` gate. Offline tests and Deno type checking cover AAL/factor binding, session checks and rate-bucket counter saturation.
- The two existing Auth-Staging synthetic username users have server-controlled `mmhvault_auth_kind='username_only_staging'`, whereas the disabled production-pinned Vault candidate requires exactly `'username_only'`. This is an **intentional fail-closed environment distinction**, not evidence that Staging live E2E was exercised. Never relax the production marker to accommodate Staging fixtures; a dedicated, separately authorized Staging adapter and matching synthetic claims are required.
- PR #11 CI now uses explicit allowlists for its known SQL and executable Edge/test source files, rejecting any newly added or unreviewed executable artifact until the review rules themselves are amended. This complements but does not replace human review.
- Auth-Staging read-only queries confirmed all six historical AAL2 session rows currently link to a verified factor on the same owner account. They do **not** represent six independent users or live signed dual-account acceptance.
- Two private Vault tables deny anon/authenticated direct access. Service-only RPC permissions are in place. In the inspected snapshot, backup records and N10-named Vault secrets were zero; this does not prove orphan-free deletion.
- Previously expired rate buckets were pruned; a Staging daily expiry cleanup is configured and active. A successfully completed scheduled run was **not** confirmed. The source-only first-install SQL has a bounded counter, but the already-installed Staging rate RPC remains the earlier implementation.

## 2026-11-01 synthetic SQL acceptance — non-release evidence
- A new read-only SQL fixture `docs/sql/n10_staging_session_guard_V2_SYNTHETIC_READ_ONLY_TEST.sql` ran on the selected Auth-Staging Postgres connection with **16/16 synthetic cases passing**: AAL1/AAL2 positive paths, absent/mismatched/unverified and cross-owner MFA factors, missing or unknown AAL, expired session, foreign owner and unknown session. All fixture UUIDs are invented static values in CTEs; no real Auth table or Vault secret was accessed or modified.
- PR #11 offline CI source checks now require this SQL to remain read-only and to preserve all 16 cases; latest source+CI milestone [#41298761006](https://github.com/myintmoehein0115024/MMHVAULT/actions/runs/41298761006) completed SUCCESS.
- The separate MFA-only PR #9 currently shares only review intent with Vault PR #11, **not a signed integration runtime**. A code/CI success or a fabricated PostgreSQL truth table cannot substitute for real, authorized JWT-based checks, Vault ownership/deletion proof, or a reviewed production rollout. Both PRs remain Draft/unmerged.
- The source-only candidate is still not compatible with installed Staging's legacy two-argument session RPC. The old locked QA retirement was platform-blocked and remains untouched.

## Active blockers — must remain closed
1. **Joint QA retirement**: source audit covered all 15 Auth-Staging Edge Functions; exactly one legacy joint MFA/Vault QA Edge still refers to the 2-argument session-check RPC. The target is release OFF, expired and allowlist empty, with `verify_jwt=true`. Deployment of an inert 410 retirement stub was explicitly **blocked by a platform safety check** despite user approval. Do not retry via a different tool, deployment channel, slug, or renamed function, and do not open or revive the QA route.
2. **Staging SQL V2**: current database has the 2-argument guard, while the reviewed future candidate requires the new 3-argument AAL/factor-bound guard. Do not run the first-install script on an installed schema. The reviewed upgrade script is *not* approval to execute; the legacy Edge dependency must first be resolved through the applicable approval process.
3. **Live acceptance**: no fresh, consented, signed AAL1/AAL2 recovery read/write, two independent users' cross-owner denial, logout/token-revocation, Vault deletion and orphan-free cleanup tests have passed under the intended newly approved QA gate.
4. **Production**: no PR merge, deployment, changes to `app.html`, `login.html`, DNS, Auth settings, RLS, service secrets or financial data without a separate production review and authorization. Never equate offline success with production readiness.
5. **GitHub drift**: Landing work continues on `main` independently; review branches may be behind. Re-compare and isolate conflicts before any merge proposal; do not merge Draft PRs automatically.

## Safe next actions while blocked
- Perform read-only health/advisor audits and offline CI regressions.
- Document any security discrepancies without attempting live QA bypass or privileged database changes.
- When the specific platform safety restriction is legitimately resolved, obtain fresh, scoped approval for the single retired Edge replacement and independently verify JWT requirement and 410 behavior before proposing any SQL V2 migration.
- If rollback is needed, prefer the reviewed fail-closed approach (disable V2 `service_role` EXECUTE), not restoring the weaker legacy guard.

**This file contains no user credentials, recovery phrases, JWTs, Vault plaintext, or account data.**
