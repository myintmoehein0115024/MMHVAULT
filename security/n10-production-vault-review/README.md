# MMHVAULT N10 — Production Vault schema review

STATUS: NOT AUTHORIZED. No Production database or Edge deployment is permitted by this draft.

The proposed private schema uses Supabase Vault encrypted secrets and an owner-index table with row-level security, no public policies and only five narrowly scoped service_role RPCs. Its two explicit operator approval settings are NEVER set by the SQL itself. The current Production project has Vault available but does not have N10 private Vault objects.

New username-only accounts must create a fixed verifier, encrypted original backup, read back the identical words, bind the username and only then grant their first login session. Every later request reads the same immutable backup. The database put operation refuses backfilling verifier-only historical accounts with arbitrary new words. For older accounts lacking encrypted originals, password-only recovery is impossible; do not falsely promise the words can be re-created.

The SQL uses ON DELETE RESTRICT on owner backups so automated signup cleanup must never delete an account after Vault backup creation. Any failed signup at that stage requires owner-bound manual reconciliation. Deletion/account privacy policy needs separate approved design.

Only the independently verified Edge may invoke service-role RPCs. Its two hard-OFF release flags, current password proof, server-verified MFA and JWT session revocation checks remain mandatory. Historical keys, finance data, APP V11, Landing, Auth settings and Production RLS are unchanged.

Before any install: independently review the SQL and failed-signup cleanup, approve a scoped Production migration, prove the signed end-to-end Staging flow on isolated test fixtures, rerun cross-owner and revocation adversarial checks, confirm current main compatibility, then request separate merge and deployment approval. Synthetic CI alone is not sufficient.

## Additional pre-enrollment guard (2026-11-04)

The guarded `backup_put` first-install candidate also checks the stored verifier format/version, **no earlier Auth session**, and **no pre-existing username owner link** before writing a Vault secret. The original-word escrow therefore cannot be used as a silent post-login backfill for even a recently created account. A known limitation is that existing backups are not retryable by this registration RPC once the account has signed in; authenticated viewing uses the distinct read-only endpoint instead. The version/format check does not cryptographically bind the SQL parameter to the verifier: that binding must remain validated by the signed reservation protocol and immediately enforced by the service role handler. All changes remain unexecuted review source.

## Banned and deleted users (2026-11-04)

The read-only Edge candidate now rejects Auth users with a deletion marker or an active ban when Auth exposes those fields. Independently, the `session_active` SQL candidate joins the authoritative Auth user row and refuses deleted, anonymous, or currently banned owners even if a previously issued JWT/session still exists. This is a review-only defense against quarantined-registration key disclosure; it has not been deployed or live-tested.
