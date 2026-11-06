# N10 — Immutable Recovery Key escrow on new username signup

**2026-11-02 • DRAFT ONLY / NO MERGE / NO DEPLOY / NO DATABASE WRITE**

## Production behavior confirmed (read-only)
The running `mmh-n10a769-username` Edge version 8 (SHA256 `238d1cf1b92440501e82e6a0b2fb3ea827f4168c3bb190ab5863930f850d6057`) prepares ten original words and verifies the original phrase against a one-time reservation. New-user enrollment currently creates a username-only Auth account, saves a **one-way HMAC verifier**, links the username and issues a session. It **does not encrypt/store a retrievable copy of the original ten words**. No existing user who lost their phrase can reconstruct it from their password or verifier.

## Isolated future candidate
`immutable-signup-escrow.mjs` is **pure, dependency-injected review code** with no running imports, Edge, SQL, credentials, or production hooks. It proposes the following safeguards:

1. Validate same prepared phrase and existing reservation; preflight a service-only encrypted Vault **before** creating an Auth user.
2. Create **a brand-new account only**, write the **same** current HMAC verifier, escrow the **same** original phrase under that exact owner's private Vault record, read the encrypted copy back to verify exact equality.
3. Only **after** successful encryption/readback may a username be linked and a verified owner session returned. Otherwise, no false registration-success response.
4. On error, rollback only the **exact newly created** account from the current operation, not any pre-existing account. If rollback is uncertain/failed, halt and require protected reconciliation; do not issue a session.
5. Continue to treat old verifier-only accounts as **not retrievable**. Never generate or replace words through a View operation. The candidate never touches existing accounts, finance data, RLS or Auth configuration.

The caller must preserve production BIP39 wordlist checks, claim-reservation HMAC, mandatory registration protections, an actually verified new-account creation result, and a service-only Vault API. The pure helper's word regex alone is not sufficient identity or entropy validation. Any real user-deletion/secret-cleanup implementation requires a separate authorized synthetic Staging review and must not act on a guessed identity.

## Impact assessment and release gates
- **Current commit impact: ZERO runtime, Auth, Edge, SQL, Vault, RLS or financial impact.** No deployment.
- Staging has prototype Vault RPCs, but uses the obsolete **2-argument** live-session guard; the reviewed Vault Edge draft needs the **3-argument** signed-session/AAL guard. Do not replay the first-install Staging SQL. Production has **no** N10 Vault RPCs.
- The private Vault backup must be immutable, owned by the same newly created account and deleted with that **newly created account only** if registration is rolled back. In every error path, confirm there is no orphan secret, verifier, link or session.
- Before any backend integration: separate schema-drift assessment, forward-only migration and rollback, permission review, two signed synthetic Staging owners, AAL1/AAL2 MFA, expired/revoked sessions, wrong password, race/retry handling, owner isolation and account cleanup QA.
- Re-read latest `main`, N10 PR #2, #11, #37, #43 and parallel APP V11/Landing changes. Strictly protect `app.html`, `login.html`, the currently active N10 Security Center, Landing, SEO and financial modules.
- Future staging DB/Edge mutations and any production merge/release require **fresh, specific owner approval**. Passing synthetic tests does not authorize them.

## Changed-file allowlist
Exactly four **new** N10 review files: `security/n10-signup-escrow-review/immutable-signup-escrow.mjs`, matching offline test, this document and `.github/workflows/n10-signup-escrow-review.yml`. The workflow prevents modifying unrelated code; it performs no deployment.
