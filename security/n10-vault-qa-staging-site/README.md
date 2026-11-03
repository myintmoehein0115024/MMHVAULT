# N10 — Separate Staging Vault QA Site (2026-11-03)

**Staging-only**, no Production user access, no merge to `main`.
Isolated Cloudflare Pages project: `mmhvault-n10-vault-staging` (auto-publishes this dedicated QA branch only).
Public URL (after deployment): https://mmhvault-n10-vault-staging.pages.dev/

Build source: `security/n10-vault-qa-staging-site/` (not the site root).
The Pages project has its own domain and must never use `mmhvault.com`, `CNAME`, login.html, app.html, Landing assets or financial data.

**Security invariant (checked 2026-11-03):** the deployed Staging Edge `mmh-n10-qa-joint-mfa-vault-20261101` is **v9** (`verify_jwt=true`), hard OFF with `RECOVERY_RELEASE_ENABLED=false`, an expired `1970-01-01T00:00:00.000Z` QA deadline, and zero allowed identities. This HTML client cannot override the server lock and has no service-role key. Until a separate time-boxed 10-minute QA admission is approved, Recovery Key actions MUST fail closed. Publication is only the inert QA test interface.

After separately approved activation, use only the two *new* and verified MFA fixtures `n10-staging-qa-a-20261103@example.invalid` and `n10-staging-qa-b-20261103@example.invalid`. Show a fresh AAL2 signed login for each. Never send recovery words, codes, passwords, signed access tokens, QR seeds, or storage secrets into chat. Test server-side password proof, immutable ten-word phrase, encrypted escrow, own-account-only read, A-to-B isolation, and cleanup. Do not delete unrelated Staging accounts.

Deployment instructions: Cloudflare Pages project links GitHub repository `MMHVAULT` to `feature/n10-staging-vault-qa-ui-20261103`, root directory `security/n10-vault-qa-staging-site`, output directory `.`, no build command. Cloudflare project creation must not cause code to merge into GitHub `main`.

## 2026-11-03 read-only staging preflight (latest verified)

- GitHub `main`: `b565601890b2f49346171ef897f79e85a32864b0`. N10 PR #57 and PR #64 remain independent Draft PRs, **not merged**. PR #64 is behind `main` but its changed paths remain isolated under N10.
- Staging project `ldivswlhtgmznzwhzsoi` is `ACTIVE_HEALTHY`. The existing joint Edge is v9, with `verify_jwt=true`, correct dedicated QA Pages origin, all three hard-OFF gates intact.
- Exact test fixtures: two confirmed Auth users, **two verified TOTP factors**, **zero fixed-key verifier rows** and **zero encrypted Vault index rows**. This is a counts-only check; recovery words and credentials were never read.
- Vault SQL `backup_get`, `backup_put`, `backup_exists`, session-check and rate-limit RPCs are `service_role`-only. `anon` and `authenticated` have **no EXECUTE** privileges on these functions.
- Dedicated Cloudflare Pages `mmhvault-n10-vault-staging` has a successful production deployment for branch SHA `14a9983691d23a6f265dc070ed4c01dd8aae99f8` on **2026-11-03 09:33 UTC**. This is the QA Pages project, **not** `mmhvault.com`.
- GitHub Actions for PR #64 SHA above completed successfully; static checks are **not** proof of signed Vault E2E.

## Mandatory next-phase gates (requires separate explicit approval)

1. Re-read the live Staging Edge version and hard-OFF gate, verify current A/B signed MFA state, server time, Vault RPC grants, test-user verifier and backup counts. Do not provision new accounts.
2. Save an exact **closed** Edge rollback snapshot. Before any temporary activation, bind exactly the already-approved A/B UID+verified-email pairs; set **server-side** expiry no later than 10 minutes from activation. Release and expiry are Edge source gates, **not** browser flags or mutable user metadata.
3. Keep `verify_jwt=true`, allow only `https://mmhvault-n10-vault-staging.pages.dev`, require live session, verified MFA AAL2, and fresh account-password proof. No Production origin or user may be admitted.
4. A: generate **one** synthetic ten-word phrase, automatically encrypt/backup, then reveal and compare **the same** words using fresh password + AAL2. Never create a second phrase on a partial failure.
5. B: independently check empty backup and prove that B cannot read A's words. Do not send either user's words, passwords, codes, tokens, or QR seeds to chat, screenshots or logs.
6. **Fail closed immediately** on broken preflight, expiry, RPC error, partial initialization, lack of remaining time, or any cross-owner access anomaly. Do not invent a replacement phrase.
7. Restore the entire **closed** Staging Edge source, verify `verify_jwt=true` and the three hard-OFF gates, verify A/B results and only authorized synthetic cleanup. Do not delete the existing A/B accounts without separate direction.
8. Leave PR #57 and PR #64 as Draft; no `main` merge or Production rollout without fresh approval.

Current status: read-only safety checks complete; the **actual end-to-end Recovery Vault acceptance is still pending**. The QA interface is independently deployed and the live server remains locked OFF.


## 2026-11-03 signed Recovery Vault A/B acceptance and rollback

**Result: A/B OWN-ACCOUNT RECOVERY FLOW PASS; CROSS-ACCOUNT ADVERSARIAL TEST NOT COMPLETE.** These results supersede the earlier pending-E2E notes above.

- Scoped owner permission covered the existing two Staging-only synthetic QA accounts. No new Auth users were created and neither account was deleted.
- Preflight: Staging joint Edge v9 was verified hard OFF, with `verify_jwt=true`; exactly two confirmed fixture accounts, two verified TOTP, zero phrase verifier rows and zero encrypted Vault backup rows.
- The existing Staging joint Edge was temporarily deployed as **v10** with exactly two fixed UID + verified-email account bindings, dedicated QA origin, existing signed-session AAL2/password guards, and an absolute server deadline **2026-11-03T10:30:55.543Z** (less than or equal to 10 minutes from the server-based starting check). No Production release or other origin.
- User screenshots and owner confirmations: A generated exactly one synthetic ten-word verifier, automatically stored its encrypted Vault backup and revealed the original key with current password and MFA AAL2. B then logged in with separate MFA AAL2, saw **no backup** while A's already existed, generated its own synthetic ten-word verifier, encrypted it, and independently revealed its original key. No words, passwords or MFA codes were sent to the chat.
- After the B screenshot, the closed v9 source was redeployed as **v11** **before the expiry deadline**. A fresh live read verified `verify_jwt=true`, `RECOVERY_RELEASE_ENABLED=false`, `QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z'`, and empty `QA_IDENTITIES`. The dedicated Staging origin restriction is unchanged.
- Post-close read-only SQL counts: **A: 1 verified TOTP / 1 recovery verifier / 1 encrypted backup; B: 1 verified TOTP / 1 recovery verifier / 1 encrypted backup**. Test backups and users are intentionally retained for immutable-key regression; no destructive cleanup was requested or performed.
- The B empty-status check after A's backup demonstrates independent **backup status**. It is **not** an explicit adversarial B→A vault-read attempt and does not alone prove all negative authorization paths. Signed cross-owner attack simulation, revoked-session races and formal full Production integration require separately scoped further QA.
- PR #57 and PR #64 remain Draft and unmerged; N10 Production has **not** been released. Landing, APP V11, finance records, RLS, auth policies, DNS and real-user data were untouched.

**Next:** review the complete remaining Production N10 login/register/recovery-key integration, address outstanding negative security cases, and obtain a separate explicit Production release authorization only after QA.

### 2026-11-03 follow-up: strict AAL2 candidate-only guard

- Offline **candidate source** now requires server-verified TOTP **and** current AAL2 even if a QA account's MFA enrollment changed. Password-only/AAL1 is explicitly rejected. This is a defense against accidental assurance downgrade.
- Added synthetic owner/issuer/session/expiry, missing-MFA and sensitive-operation ownership guard tests, plus an exact-source-diff check and read-only CI. These tests do not use signed sessions and do **not** prove a live B-to-A attack is rejected.
- Existing Staging Edge **v11 remains closed and unchanged**; the new candidate has **not** been deployed. To reopen any sensitive QA, obtain a separate scoped authorization and fresh review. Historical A/B recovery words remain immutable.
- Only N10 isolated candidate/test/CI/readme paths are changed. PR #64 is still Draft. No login.html, app.html, production Auth, RLS, Landing, SEO or finance files touched.
