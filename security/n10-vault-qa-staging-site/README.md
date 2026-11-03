# N10 — Separate Staging Vault QA Site (2026-11-03)

**Staging-only**, no Production user access, no merge to `main`.
Isolated Cloudflare Pages project: `mmhvault-n10-vault-staging` (auto-publishes this dedicated QA branch only).
Public URL (after deployment): https://mmhvault-n10-vault-staging.pages.dev/

Build source: `security/n10-vault-qa-staging-site/` (not the site root).
The Pages project has its own domain and must never use `mmhvault.com`, `CNAME`, login.html, app.html, Landing assets or financial data.

**Security invariant:** the deployed Staging Edge `mmh-n10-qa-joint-mfa-vault-20261101` remains v2, hard OFF with `RECOVERY_RELEASE_ENABLED=false`, an expired QA deadline, and zero allowed identities. This HTML client cannot override the server lock and has no service-role key. Until a separate time-boxed 10-minute QA admission is approved, Recovery Key actions MUST fail closed. Publication is only the inert QA test interface.

After separately approved activation, use only the two *new* and verified MFA fixtures `n10-staging-qa-a-20261103@example.invalid` and `n10-staging-qa-b-20261103@example.invalid`. Show a fresh AAL2 signed login for each. Never send recovery words, codes, passwords, signed access tokens, QR seeds, or storage secrets into chat. Test server-side password proof, immutable ten-word phrase, encrypted escrow, own-account-only read, A-to-B isolation, and cleanup. Do not delete unrelated Staging accounts.

Deployment instructions: Cloudflare Pages project links GitHub repository `MMHVAULT` to `feature/n10-staging-vault-qa-ui-20261103`, root directory `security/n10-vault-qa-staging-site`, output directory `.`, no build command. Cloudflare project creation must not cause code to merge into GitHub `main`.

Current status: static QA client code reviewed; offline CI passed; signed Vault E2E remains untested.
