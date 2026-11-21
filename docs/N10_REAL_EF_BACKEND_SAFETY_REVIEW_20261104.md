# N10 — Real E/F Staging Backend Safety Review (2026-11-04)

**REVIEW ONLY — NOT AN APPROVAL TO RUN SQL.** No Production access, deployment, database writes, Auth user creation, or QA activation is authorized by this document.

## Confirmed review baseline

- N10 Draft PR #74 head at review: `61e6ee3f6d6fc0ba578043f2e4f21746a84ad005`.
- Latest inspected `main`: `634c79fec350d33df93441dabe77afdaf53f093e`. The parallel Landing/APP/Analytics changes do not overlap N10 PR changed paths; **re-check on every future write/merge**.
- Two final-head CI runs `41809256751` and `41809263222` completed SUCCESS, including static/synthetic tests, Deno checks and Chromium/WebKit. CI does **not** establish real signed E/F MFA acceptance.
- Read-only Supabase Staging project: `ldivswlhtgmznzwhzsoi`. Production `vrypucmyrztxgiqhjspd` was not queried or modified.
- Real E/F gate `enabled=false`, expired; real Auth users / bindings / backup index `0/0/0`.
- Old synthetic E/F backup index count `2`; historical `n10qa_%` A/B/C/D backup join count `4`. Do not remove or replace these fixtures.
- Required real E/F backend RPC `public.mmh_n10_realef_backup_put(uuid,text,text,text)` is **absent**: the blocked migration has not run.
- The two deployed E/F Edge V1 sources remain release-disabled (`RELEASE_ENABLED=false`, expiry 1970) and untouched in this review.

## Target file — blocked, unexecuted migration

`security/n10-v2-qa/staging_real_ef_backend_NOT_AUTHORIZED.sql`

**Do not retry, split into SQL snippets, copy into the dashboard SQL editor, or execute from another API to evade the prior platform safety denial.** A new supported, independent safety approval is necessary. The migration must not be attempted just because this document or a test passes.

### Static review findings

1. A single `BEGIN` / `COMMIT` transaction wraps private-table DDL, eight scoped `public.mmh_n10_realef_*` RPC definitions, and final client EXECUTE revocations.
2. Preflight requires the existing isolated private E/F schema, old synthetic V2 schema, the legacy Vault schema, disabled/expired E/F gate, a separate disabled V2 gate, exactly two identity slots, zero real bindings/backups, two synthetic backups and four historical A/B/C/D joins. It rejects already-installed public RPC signatures and absent Vault support.
3. Proposed private tables: `slot_claims`, `verifiers`, `rate_buckets`. They enable RLS and revoke direct table access for `PUBLIC`, `anon`, `authenticated` and `service_role`. The established private `qa_gate` and `auth_bindings`/backup-index remain separate.
4. The eight exposed-schema RPCs use `SECURITY DEFINER` and an empty `search_path`; all `anon`/`authenticated` and `PUBLIC` EXECUTE privileges are explicitly revoked before commit; only `service_role` receives EXECUTE. These remain privileged code: all Edge call sites must authenticate the exact owner, validate the server-side signed JWT and session, and require verified TOTP AAL2 for recovery reads.
5. New Auth identity bindings are limited to E/F slots and server-owned `app_metadata`; the original ten-word phrase has an immutable verifier, encrypted Vault backing and transaction-scoped exact readback before first session. Ambiguous operations require manual reconciliation and must not trigger deletion/overwrite.
6. Read-only schema checks confirmed relevant `auth.users`, `auth.sessions`, `auth.mfa_factors` fields, `vault.create_secret(text,text,text,uuid)` and `vault.decrypted_secrets` exist. These **do not** establish that executing the entire migration is safe or authorized.
7. Supabase security advisor reports INFO about private RLS-on/no-policy tables (deliberately denied to clients); it separately warns that leaked-password protection is disabled in Staging. No Auth setting was changed.

### Residual risks and conditions before any later approval

- **Privilege boundary:** functions in `public` run as their definer. Confirm individual client EXECUTE denial and function ownership after any approved migration; do not infer safety merely from RLS.
- **Migration targeting:** explicitly bind any future approved migration to Staging project `ldivswlhtgmznzwhzsoi`; SQL preflight table-count matches alone are not a cryptographic project identity check.
- **Irreversibility:** one-shot E/F claim, immutable owner mapping and original-key backups must not be reset to retry a failed Auth flow. Preserve actual data and reconcile failures manually.
- **Real QA not yet done:** verify signed TOTP AAL2, encrypted escrow-before-first-session, owner separation E↔F, password failure, session revocation, race conditions and 45-second hide under a **separate**, time-bounded Staging-only activation approval.
- **Release gates:** backend migration approval, E/F Edge activation, Production migration/deployment and PR merge are distinct decisions. No other change implies any of them.

## Outcome

**Code review and read-only Staging verification completed. Execution NOT AUTHORIZED / BLOCKED.** Keep PR #74 Draft, retain both V1 E/F Edges hard OFF, retain real E/F counts at zero, and preserve all legacy fixtures. Proceed only after a supported safety review/approval resolves the prior platform denial; do not route around it.
