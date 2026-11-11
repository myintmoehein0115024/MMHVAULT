# N10 Vault — read-only installed-schema and verifier compatibility audit

**Date:** 2026-11-01 UTC. **Scope:** existing owner-connected production and Auth-Staging database *metadata*, deployed original recovery-verifier Edge source, and GitHub PR #11 *review-only candidate*. No data writes, migrations, Edge redeploys, QA switch changes, recovery phrases, Vault inventory rows, encrypted secrets, JWTs, passwords or private finance content were accessed.

## Projects and metadata results

| Property checked via read-only metadata | Formal production `vrypucmyrztxgiqhjspd` | Auth-Staging `ldivswlhtgmznzwhzsoi` |
|---|---|---|
| `vault.create_secret(text,text,text,uuid)` exists | yes | yes |
| `vault.secrets` relation exists | yes | yes |
| `vault.decrypted_secrets` view exists | yes | yes |
| `auth.sessions` relation and `not_after` column exist | yes | yes |
| `mmh_n10_privacy.recovery_backup_index` exists | **no** | **yes** |
| `public.mmh_n10_recovery_backup_put(uuid,text)` exists | **no** | **yes** |
| `public.mmh_n10_recovery_backup_get(uuid)` exists | **no** | **yes** |

**Staging-only additional checks (metadata, not data):**
- N10 `backup_put`, `backup_get`, `backup_exists`, `take_attempt` and `session_active` RPCs all exist. Each has `anon EXECUTE=false`, `authenticated EXECUTE=false`, `service_role EXECUTE=true`. This is consistent with service-only access and **does not** prove their security implementation, runtime owner isolation or encryption.
- `mmh_n10_privacy.recovery_backup_index` and `recovery_rate_bucket` have RLS enabled.
- `mmh_n10_recovery_secret_gc` trigger on the backup index exists and is enabled. `cleanup_recovery_vault_secret()` and the `backup_get` RPC are SECURITY DEFINER.
- Actual Vault creation signature observed in Staging is `new_secret text, new_name text, new_description text, new_key_id uuid`, as expected by the current **unexecuted** PR #11 SQL source.

## Immediate gate implications

1. **DO NOT rerun the PR #11 `docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql` on Auth-Staging.** It is a *first-install only* migration, and its namespace and primary functions already exist in Staging. An ordinary CREATE will conflict. Do not DROP, overwrite, recreate, or run `CREATE OR REPLACE` to force success. Any future change needs an approved schema-drift review, synthetic database backup, explicit migration/rollback and scoped authority.
2. **Do not imply production has Vault N10 installed.** The generic Vault extension exists, but the N10 backup index and RPCs are absent. The independent PR #11 is **only source code**, `RECOVERY_RELEASE_ENABLED=false`, not a deployment.
3. **The GC trigger existing is not a deletion E2E PASS.** Never claim orphan-free Vault cleanup based on `pg_trigger` or `ON DELETE CASCADE` alone. A separately authorized test must verify actual backup index deletion and corresponding secret removal without revealing stored content.
4. **Metadata cannot prove all Staging objects match the candidate.** The query verified existence, RLS/grants, trigger enablement, and a function signature, **not** source-body equality, table contents, individual privileges of all columns, or verified cryptographic behavior. The existing Staging installation may have drift.
5. **Residual deletion design item for future review:** the candidate `recovery_rate_bucket` table has a hashed `bucket` PK and a `reset_at`, but no `user_id` foreign key and no expiry-pruning mechanism in the candidate `take_attempt` function. Consequently it is **not yet proven** that deleting an account removes all related hashed rate bucket entries. Design and test a privacy retention/cleanup policy separately, without applying SQL to the existing Staging installation.

## Original ten-word verifier source cross-check

A **read-only source inspection** of the existing production Edge function `mmh-n10a783-phrase-verify` (version 4) found the verifier compares an HMAC of `'phrase:'+user.id+':'+phrase` with domain prefix `'mmh-a769-prod:'` using `N10A740_RATE_HMAC_KEY`. The PR #11 Vault candidate uses the same input format/prefix and secret *variable name*. That is a **source-level compatibility finding**, not proof of runtime success; actual Secret values, identity, config and verification were not accessed or tested. Do not copy those values into test fixtures.

## Outstanding release barriers

- Existing Staging A last had **one unverified TOTP factor, zero verified**, so fresh signed Auth AAL2 acceptance is still missing.
- Independent QA activation was previously blocked by safety controls and its page remains LOCKED/expired. **Do not bypass** through this branch or a different API/platform.
- Real signed AAL1 deny / AAL2 allow on **the exact Vault service**, encrypted backup/reveal, owner isolation, revocation, no plaintext leaks and orphan-free deletion E2E remain **UNTESTED**.
- PR #11 remains Draft and must **not** be merged or deployed; PR #9 MFA-only remains independently Draft, and original PR #2 still has conflicts. No production rollout approval has been granted.

**Audit conclusion:** Some Staging structural protections match the candidate's *intended* privileges and object types, and generic Vault prerequisites exist in both environments. The Staging first-install migration is definitively **inapplicable as-is** because the target objects already exist. This narrows the migration-planning risk; it does not clear the real security acceptance gate.
