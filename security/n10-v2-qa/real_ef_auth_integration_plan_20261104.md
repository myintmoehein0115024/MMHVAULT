# MMHVAULT N10 — real Staging Auth E/F integration readiness and isolation plan (2026-11-04)

**REVIEW ONLY — NO AUTH USER CREATION, DATABASE WRITE, EDGE DEPLOYMENT, RELEASE FLAG CHANGE, PRODUCTION CHANGE, OR PR MERGE AUTHORIZED BY THIS DOCUMENT.**

## Scope and verified source baseline

- GitHub `main`: `236e18d7bc0bb01283f4ea98a3432ba0003fca2c`, merged Landing L1.61 / PR #99 at 2026-11-04 07:34 UTC. Do not rewrite Landing.
- N10 Draft PR #74 head before this plan: `dd85d7444e7e8d66197ca53720bd6dba6eab00c1`. It was 6 commits behind main; since merge base `5f1f068f4bf5af2720aa57122a8d46d62b3d2efe`, new main changed only public Landing / related test files, with **no changed-path intersection** with PR #74's 43 N10 files. Recheck immediately before any later merge.
- CI GitHub run `41792464489`: success on the reviewed PR head. This is **offline/static + synthetic browser** evidence, not signed Auth E/F end-to-end QA.
- Staging project only: `ldivswlhtgmznzwhzsoi`. Production `vrypucmyrztxgiqhjspd` was not queried or changed in this check.

## Direct read-only Staging verification (2026-11-04 ~07:36 UTC)

- Private synthetic E/F schema: `mmh_n10_v2qa_20261104`. `qa_window.enabled=false`; expiry 2026-11-04 16:00 UTC; operational=false. Do **not** reopen this synthetic environment for real Auth testing.
- Exactly 2 synthetic E/F owners, 2 verifiers, 2 synthetic sessions and 2 encrypted backup-index rows. These are **NOT** entries in `auth.users` and are **NOT** real AAL2/MFA results.
- All 7 private tables have RLS enabled. `anon` and `authenticated` have no table SELECT privileges. All 3 private functions (V2 3-argument `backup_put`, `recovery_matches`, `take_attempt`) grant EXECUTE to `service_role` and deny `anon`/`authenticated`.
- Prior QA records remain: 4 `n10qa_%` username links, all 4 with version-1 verifier and encrypted backup-index join. There are 6 total legacy Staging verifiers/backups, so **do not** infer only four entries exist or remove the additional historical fixtures.
- Existing Staging public **two-argument** `mmh_n10_recovery_backup_put(uuid,text)` exists; public **three-argument** variant does not. The private V2 three-argument function is synthetic-only and must never be treated as the integrated Auth contract.
- `mmh-n10-fixed-vault-qa-locked` Staging Edge version 11 has `verify_jwt=true` and a **retired stub returning HTTP 410 `qa_retired`**, with no secret or Auth operations. Do not alter/reopen this endpoint.
- Supabase security advisor returned INFO for deliberately private tables with RLS and no policies; this is expected for denied client access. It also reported **leaked-password protection disabled** for Staging Auth: follow up on that setting separately before a release, without making an unapproved Auth configuration change.

## Candidate backend source review (not deployed)

- Review-only username Edge `security/n10-username-escrow-candidate/username-edge-REVIEW-ONLY.ts` has `RELEASE_ENABLED=false`. Enrollment candidate: claim one reservation, create a *new* username-only Auth identity, insert verifier, call three-argument immutable backup put, exact readback, link username, then grant session. An ambiguous create/backup result must not delete an unrelated user or disclose a token.
- Existing `build-staging-bundle.mjs` is Staging-pinned and hard OFF, but its `build-staging-live-qa.mjs` is an **old temporary A/B tool**, with `WINDOW_END_UTC='2026-11-04T13:00:00Z'`. **Never reuse, extend or repoint that old allowlist for E/F.** Create a separately reviewed E/F-only package after specific authorization.
- `security/n10-production-vault-review/index.ts` requires both `RECOVERY_RELEASE_ENABLED=false` and `PRIVATE_VAULT_SCHEMA_APPROVED=false` to remain OFF; Production-only draft SQL is not executable without separate Production approval and is irrelevant to Staging E/F deployment.
- Production viewer candidate derives owner from Auth-validated JWT, checks factor/AAL, verifies password, re-checks the same session after decrypting, and enforces 45-second disclosure. This has not been demonstrated with real E/F signed sessions in the new isolated flow.
- **Release blocker:** the proposed public 3-argument RPC is absent in active Staging. Its logic must first be explicitly isolated and approved for a new real Auth test namespace, with its own permissions, JWT/session ownership safeguards and no write path to the synthetic V2, legacy A/B/C/D or Production.
- Cross-owner, wrong-password, account-switch, race, token-revocation and actual MFA behavior still need signed real Auth proof. Never label the V2 boolean fixture test as real login QA.

## Separate real E/F test design — new explicit authorization REQUIRED

**Allowlist and identities:** Create exactly two *new*, uniquely named, Staging-only username/password accounts (E-real/F-real) after explicit user approval. Do not change/reuse the E/F synthetic fixture IDs, or any A/B/C/D accounts. Names and alias emails must be unambiguous and preflight-checked. No real personal email is required.

**Isolation and runtime:** Use a *new* E/F-specific, short-lived Staging Edge function and approved Auth-aware private backend. Pin the Staging project ref, exact dedicated QA origin and two-name allowlist; require own Turnstile and HMAC secrets. Fail closed on absent secret, wrong origin, wrong project, no Auth JWT, expired QA window, non-allowlisted identity or invalid owner/session. Prefer `verify_jwt=true` for authenticated recovery/reveal; if public signup must use `verify_jwt=false`, provide separate strict CAPTCHA, rate limiting, request/action schema, and staging-only allowlist. Do not deploy an endpoint until newly approved; do not give the old 410 retired endpoint new behavior.

**Acceptance steps and expected safety outcomes:**
1. Preflight read-only: latest main/PR status, existing four QA owner links/verifiers/backups, synthetic E/F counts, QA hard-OFF and private ACLs, old two-argument RPC. Baseline snapshots without plaintext words or user tokens.
2. E-real signup: create exactly one Auth user; generate one original 10-word phrase; prove verifier is paired with that same phrase and encrypted escrow is committed **before** the first successful session. Idempotent retry does not make another backup or rotate words.
3. F-real signup: same process with distinct original words and one distinct owner. Verify no owner collision, cross-link or duplicate Auth user.
4. Password login for both: correct password succeeds; wrong password fails, rate limit enforced. No passwords, actual recovery words, JWTs, TOTP seeds or CAPTCHA secrets in CI, logs, PR comments or screenshots.
5. Real Google Authenticator TOTP: enroll/challenge/verify both, confirm actual signed session `aal2` and server-side verified factors; `aal1` must fail to reveal when MFA is enrolled.
6. Recovery Key viewer: after fresh password proof and required MFA, retrieve only the **same original** ten words for the same owner; visually hide and clear after 45 seconds, modal close, account change, tab visibility change and logout. Never regenerate/reset/overwrite. A historically verifier-only account must return a safe unavailable state, not newly invented words.
7. Adversarial cross-owner attempts: E cannot request F's existence/words and vice versa; forged owner ID, different signed token, wrong session, wrong password, MFA not verified, token expiry and revoked server session must deny. Recheck immediately before return and after async Vault read.
8. Backend consistency: a concurrent different-phrase write cannot replace a fixed key; exactly one encrypted backup per owner. An ambiguous write or session grant quarantines/reconciles the newly created QA identity rather than guessing a delete.
9. Close test: disable *new* temporary E/F Edge and allowlist, revoke new QA sessions, verify post-close rejection. Retain E/F test data until separate cleanup approval; do not mutate existing A/B/C/D or synthetic E/F.
10. After-test read-only differential check: four prior QA links+verifiers+backup indexes unchanged, synthetic E/F 2+2 backup records unchanged, no PR merge or Production deployment. Record only counts, responses and pass/fail markers.

**Approval gates are separate:** (a) creation of real Staging Auth E/F identities and dedicated staging backend/migration; (b) Staging Edge deployment and temporary window; (c) any Production database migration; (d) any Production Edge deployment; (e) PR #74 merge. Approval (a) does not authorize (b)-(e).

## Status of this document

A planning and review artifact committed to N10's isolated Draft branch only. Read-only Staging checks and prior GitHub CI were performed; **real E/F Auth login / MFA have NOT been executed**. No release or merge is implied.
