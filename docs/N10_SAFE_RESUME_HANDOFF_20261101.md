# MMHVAULT N10 — safe Staging integration unblock handoff

**Status: BLOCKED / REVIEW ONLY / NO DEPLOYMENT.** 2026-11-01 (Thailand UTC+7).
Production website, app.html, login.html, Auth settings, DNS, account data and finance data are entirely out of scope.

## Verified state in the November 1 read-only recheck

| Component | Observed state | Meaning |
|---|---|---|
| Auth-Staging project | `ldivswlhtgmznzwhzsoi`, active/healthy | Isolated project, not production |
| Legacy session RPC | `public.mmh_n10_recovery_session_active(uuid,uuid)` **present**, owner `postgres`, source MD5 `4778bf3220e2faf29af54186c226e3ed` | Installed old implementation; do not silently overwrite |
| V2 session RPC | `public.mmh_n10_recovery_session_active(uuid,uuid,text)` **absent** | Source-only V2 is not installed |
| Legacy RPC ACL | anon EXECUTE=false; authenticated EXECUTE=false; service_role EXECUTE=true | Direct user roles cannot call the legacy RPC |
| Existing recovery schema | Private backup index with RLS; backup put/get RPCs exist | First-install SQL candidate is incompatible with already-installed Staging |
| Exact legacy Edge dependency | `mmh-n10-qa-joint-mfa-vault-20261101` active Version 1; `verify_jwt=true`; read-only deployed source contains a call to the **legacy 2-arg** RPC | Cannot drop old RPC safely until this exact caller is formally retired |
| Legacy QA runtime gate | Deployed code contains `RECOVERY_RELEASE_ENABLED=false`; previous QA allowlist/window recorded closed | An ACTIVE deployment is **not** proof of an open QA route; do not reactivate |
| Rate-bucket daily cleanup | `n10-staging-recovery-rate-bucket-expired-cleanup` active; schedule `15 3 * * *` | First eligible run due 2026-11-02 03:15 UTC / 10:15 Thailand; scheduled read-only follow-up already exists for 10:20 Thailand |
| Three independent GitHub reviews | MFA-only PR #9, Vault-only PR #11, app-entry PR #20 are all Draft/unmerged | Offline/source tests are **not** signed A/B Auth or Vault E2E |

The exact earlier **platform safety denial** of replacing the legacy joint QA Edge with an inert 410 stub is **unresolved**. Neither the original rejection message nor the reviewing authority is available in this review record. Do **not** guess that it was Supabase permissions, timing, a bad secret or a temporary error. **Do not retry** through a new tool, alternate deployment channel, renamed slug or route. Owner consent for prior scope did not override the platform block.

## Strict sequence once the original blocking mechanism formally releases the action

**Gate 0 — external platform clearance (NOT satisfied).**
- Use the original platform approval / governance path to obtain documented clearance for the previously blocked **exact Edge replacement**. Record the actual denial rationale, reviewing authority, allowable method and scope.
- Obtain fresh user approval for that one operation. No secret values, JWTs, recovery phrases or user identifiers may appear in logs or approval text.
- If clearance is unavailable, **stop here**. Continue only SELECT-only metadata audits and Draft CI. No test user sign-in or SQL V2 migration is implied.

**Gate 1 — formal legacy QA retirement (NOT satisfied).**
- After Gate 0 and separate scoped approval, retire the **same existing** `mmh-n10-qa-joint-mfa-vault-20261101` deployment through its authorized original channel, rather than launching a new QA endpoint. The existing review-only retirement stub has no live operational authorization now.
- Independently verify the exact Edge's version, `verify_jwt=true`, inert HTTP 410 behavior, release OFF and absence of its 2-arg RPC caller. Confirm no other deployed Edge caller remains. Do not start QA or alter production.
- If this verification is incomplete or fails, **stop** and keep V2 blocked.

**Gate 2 — isolated Auth-Staging V2 migration (NOT satisfied).**
- Obtain a different explicit authorization, an approved maintenance window and tested rollback/backup plan.
- Re-run SELECT-only preflight for legacy function hash, owner, privileges, zero SQL dependencies, auth.sessions / auth.mfa_factors required columns, and no external old Edge caller.
- Run ONLY an independently approved **versioned V2 UPGRADE** if all preflight gates match. NEVER rerun `docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql`: it is first-install-only, already installed in Staging.
- Post-check: 2-arg RPC gone; 3-arg AAL/factor guard installed, service-only callable; no `anon`/`authenticated` EXECUTE; no finance or user data changed.
- In an emergency, use a separately authorized **fail-closed** EXECUTE disable, not restoration of the weaker guard. Stop on schema drift or rollback uncertainty.

**Gate 3 — real signed owner-controlled acceptance (NOT satisfied).**
- Requires new and explicit QA activation permission, two synthetic owner-controlled accounts A/B, a narrow window, and auto-close plan. Existing locked/expired QA remains locked until permitted.
- Verify in the actual intended service: email, username and Google sign-in paths; AAL1 denied when TOTP required; verified AAL2 accepted; missing/invalid factors denied; stale/refreshed/revoked tokens and logout denied; user A cannot read/modify B recovery backup; saved original 10 words match immutable verifier; password proof; backup/reveal encryption and no unexpected plaintext; repeat backup does not overwrite; account deletion removes both index and corresponding Vault secret; orphan-free cleanup and private rate-bucket retention.
- Record pass/fail without tokens, actual 10-word keys, secret IDs, passwords or personal finance. Browser synthetic tests and 16-case SQL truth tables do not satisfy this gate. Close QA and verify flags/permissions afterward.
- The daily cleanup can be marked a **separate scheduling PASS** only after an observed successful real scheduled run; its success alone does not establish owner erasure or secret deletion.

**Gate 4 — separately authorized production rollout (NOT satisfied).**
- Coordinate latest `main` (Landing/financial updates) with PRs #9/#11/#20, check conflicts and final green CI, align recovery client UI and private-data timeout. Confirm rollback snapshot and deployment method.
- Obtain new explicit production approval for exact changed files and backend steps. Never combine a Draft PR merge, Vault enablement, login rewrite, finance change, DNS/RLS change or secret migration by implication.
- Real production readiness requires separately scoped test evidence, not merely the successful offline source reviews.

## Current owner action and stopping rule

No immediate owner action is needed merely to maintain the current closed state. **To proceed toward live QA**, the one external dependency is documented resolution of the earlier platform safety denial **through the original approval authority**, followed by operation-specific user approval. Do not request that the user paste private keys or enable QA flags as a workaround.

At any gate: unknown approval status, platform refusal, mismatch in source hash, new Edge caller, ACL drift, missing backup, failed signed isolation test or inability to restore a closed state = **STOP / NO DEPLOY**.

## Evidence constraints
This document is an internal review artifact on Draft PR #11, not an operational instruction to bypass a control. Staging was queried with read-only metadata; deployed source was retrieved read-only; no passwords, JWTs, decrypted Vault records, real finance data, grants, migrations, Edge deployments or flags were modified in preparing it.
