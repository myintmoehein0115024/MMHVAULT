# N10 — Production MFA release candidate verification (2026-10-31)

**Release decision: NOT DEPLOYED / NOT YET AUTHORIZED.** Everything below was read-only against production; candidate SQL and rollback scripts were committed solely to the N10 feature branch.

## Confirmed Staging evidence
The isolated current Auth Staging project `ldivswlhtgmznzwhzsoi` passed **11/11 real Auth-issued signed JWT** negative/positive security tests, as user-confirmed by a screenshot and recorded in `docs/N10_REAL_AUTH_JWT_RLS_RPC_STORAGE_ACCEPTANCE_20261031.md`. Tests covered AAL1/AAL2, RLS, owned and foreign UID privileged RPC paths, Storage upload/download/delete, and successful cleanup. The Staging QA bucket had 0 residual objects after the run.

**Limit:** Those were synthetic fixtures for the actual Auth Staging users; they were NOT the production 59 tables, production wallet mutation path or production buckets. Previously issued signed URLs and Edge APIs bypassing RLS remain separately reviewable.

## Fresh production read-only preflight
Ran the SQL file `docs/sql/n10_mfa_release_readonly_preflight.sql` against production project `vrypucmyrztxgiqhjspd`. **16/16 result fields TRUE**, including:
- Exact 59 protected business tables and 5 internal/deny-all Auth tables = 64 expected tables; RLS enabled everywhere, no unreviewed new public table.
- All three expected Storage buckets `receipts`, `mmh-feedback`, `mmh-business-assets` private; all 11 original Storage owner/administrator policies still exist.
- Existing wallet deletion RPC remains a `postgres`-owned `SECURITY DEFINER` function callable by `authenticated`, not `anon`, with no pre-existing N10 marker.
- N10 helper and both policy guards not yet deployed in production, as expected.
- The public legacy catalog view has `security_invoker=true`.

**These preflight checks confirm expected baseline inventory; they do NOT independently establish every real production data-access path's security after rollout.**

## Candidate deployment and rollback changes
- `n10_mfa_public_policy_candidate_NOT_FOR_DEPLOYMENT.sql`: 59 additive restrictive policies, retains all original ownership rules, rejects inventory drift.
- `n10_mfa_storage_policy_candidate_NOT_FOR_DEPLOYMENT.sql`: additive restrictive policy for the three private buckets, marked `MMHVAULT-N10-MFA-STORAGE-RESTRICTIVE-V1`.
- `n10_mfa_wallet_rpc_candidate_NOT_FOR_DEPLOYMENT.sql`: checks MFA at privileged function entry; preserves owner/UID logic and returns the same data type; verifies original owner and EXECUTE grants before replacement, marked `MMHVAULT-N10-WALLET-MFA-V1`.
- Public RLS rollback reverts only marker-matched N10 policies.
- Private Storage rollback refuses to drop a policy unless its marker matches.
- Wallet RPC rollback restores the **exact original production function definition** captured read-only on 2026-10-31 and refuses to run without a correct release marker.
- `n10_mfa_atomic_release_NOT_FOR_DEPLOYMENT.sql`: composes all three candidates into one **transaction**, avoiding a partial RLS/Storage/wallet enforcement window.
- `n10_mfa_atomic_rollback_NOT_FOR_DEPLOYMENT.sql`: restores the old wallet function and drops Storage/public N10 policies atomically; checks 59 tagged policies first. No user data or Storage files are deleted.

The build only contains review candidates. **Do not run any SQL without owner approval.** After any permitted deployment, independently verify the expected policies, original grants, signed-token functionality and rollback.

## Remaining release gates
1. Production-like post-deployment tests of the exact production wallet RPC path (do NOT delete real wallet records), signed URL issuance and existing pre-signed URLs, and Edge/service-role paths, including AI and Push endpoints.
2. Full front-end E2E covering unified Email/Username, Google OAuth, recovery words, MFA, refresh, direct app access, all mobile/desktop layouts, and safe rollback of front-end files.
3. Production change-window approval and production-specific backups plus secret/flag state confirmation. Do not change `main`, `app.html`, `login.html`, RLS, service functions, DNS or financial data until specifically authorized.

**Recommendation:** Keep PR #1 as Draft pending the above and release approval. No finance data has been modified by this read-only review.
