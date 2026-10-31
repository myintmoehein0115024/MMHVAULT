# MMHVAULT N10 — Production Release Record
Release date: 2026-10-31 (Thailand time). Scope: approved N10 authentication UI and conditional MFA access controls.

## Production changes
- GitHub main frontend:
  - `js/mmhvault-n10-a7-69-username.js`: commit `d8123e7a117ea6a772339ec0f442b95f25b2cded`
  - `app.html`: commit `60802147e1e8e2937b86d4a56f6b954e53dffeeb`
  - `login.html`: commit `5718e224c7d8f86c567a51f61c9f9c76ebd97232`
- Production Edge functions:
  - `mmh-financial-assistant` v9, JWT verification on
  - `mmh-push-test` v7, JWT verification on
  - `mmh-n10a783-phrase-verify` v3, JWT verification off, with its own Auth bearer validation
- Production SQL: atomic N10 migration enabling 59 business-table restrictive MFA policies, the private Storage guard and the privileged crypto wallet deletion MFA condition.
- Preflight: 16/16 true. Postflight: 17/17 true.
- Post-release checks: original transaction, investment, wallet movement, private file, and Auth-account counts unchanged; public RLS policies increased by 59 as expected.
- Production Supabase Edge read-back confirmed correct function source and `verify_jwt` settings.
- No DNS changes or intentional financial-record modifications.

## Rollback and caveats
- Frozen original main branch: `backup/n10-production-before-20261031`, source commit `9ef8461af143c02526df38c2e7b2599e960855da`.
- Original Edge version identifiers: financial AI v8, Push v6, phrase verification v2. Restore exact previous deployments via the Supabase function deployment history or previously captured function source.
- SQL rollback candidate: `docs/sql/n10_mfa_atomic_rollback_NOT_FOR_DEPLOYMENT.sql` in N10 feature branch. Requires operator review before executing.
- An independent full-database backup was not captured as part of this release; the owner elected to proceed without it, using existing application personal-data JSON export and code/SQL rollback safeguards. That JSON is not a substitute for a full database/Auth/Storage backup.
- PR #1 remains Draft; the three vetted frontend files were applied directly to main. **Do not reapply the SQL migration** or merge unreviewed candidate scripts to production.
- GitHub repository source and database metadata were verified. Live external browser UX and real personal-login/finance flows still require owner smoke-testing; this document does not claim those tests were completed.

## Follow-up
Verify `https://mmhvault.com/login.html` in a fresh browser session, login with supported credentials, complete TOTP if enrolled, open the app, and use Settings > Data > Data Center > Export Backup for a personal JSON copy. Preserve private receipt attachments separately if needed. Stop/review and rollback on any login or financial access regression.
