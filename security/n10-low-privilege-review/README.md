# MMHVAULT N10 — Low-privilege Auth metadata escrow (OFFLINE REVIEW ONLY)

**Status:** RESEARCH / SYNTHETIC PROTOTYPE / **NO DEPLOYMENT AUTHORIZATION**.
**Project target for conceptual fit:** Supabase Auth Staging \`ldivswlhtgmznzwhzsoi\`, **not Production**.
**Production project must not be inspected, connected, mutated or deployed by this prototype.**

## Why

The existing N10 E/F real-Staging backend SQL \`security/n10-v2-qa/staging_real_ef_backend_NOT_AUTHORIZED.sql\` was previously blocked. That exact denial remains operative: **never execute, retry, divide, rename, re-route or indirectly reproduce the blocked operation**. This proposal does not import, call, update or replace that SQL. It is an **independent design candidate for security review**, not a workaround execution.

The existing draft uses eight exposed-\`public\` \`SECURITY DEFINER\` methods, including first-phrase Vault escrow write. The review asks if a new username-only Auth account could instead **carry an encrypted first-recovery envelope in its own server-controlled \`app_metadata\` at \`auth.admin.createUser\` time**. This is supported at the SDK type level by \`AdminUserAttributes.app_metadata\`, but real GoTrue persistence semantics and security guarantees require separate validation.

### Proposed new-account-only sequence (not wired)

1. Server validates the exact username format, BIP39 10-word sequence, Turnstile and rate limits. Never use fake wordlist validator from synthetic tests on real users.
2. Server generates / verifies original immutable 10 words and encrypts them using AES-256-GCM with **random 96-bit nonce**, separately managed encryption key and authenticated data bound to the exact staging project + canonical username + internal email alias.
3. One **Auth Admin createUser request** supplies the unique alias email, password, \`email_confirm\`, and ciphertext-only \`app_metadata\`; no public custom RPC or separate first-recovery Vault write is needed in this candidate.
4. Before any public signup-success or session grant, **server re-reads the newly created exact user and decrypts/compares the initial envelope**, checking alias, account type and expected owner. A missing/ambiguous Auth response must **quarantine** the registration for manual reconciliation, never regenerate/replace a phrase and never delete arbitrary users.
5. Standard username/password login would resolve to the deterministic alias **only for explicitly marked new accounts**; legacy linked-email and existing username accounts keep their prior lookup paths untouched.
6. Password-confirmed recovery reveal requires a separately reviewed endpoint: authenticated JWT owner, current-password proof, *live* session id, real TOTP AAL2 when enrolled, exact encrypted envelope from the account, full-session recheck after decryption, 45-second client auto-hide and logout wipe. No anonymous reveal API.
7. Ten-word **phrase login** is unresolved in this prototype: it requires a vetted, rate-limited server-side identity lookup and issuance method that does not expose keys or bypass MFA. Do **not** declare feature parity until this is solved.
8. Old username accounts with verifier only and no first escrow cannot retrieve original plaintext. No synthetic replacement, regeneration, rotation or legacy data mutation is permitted.

### Risks / hard blockers before real use

- **Metadata exposure:** \`app_metadata\` may be embedded in JWTs and returned to users. It **must never contain plaintext key, unkeyed verifier, passwords or AES keys**. Even ciphertext in tokens increases exposure and JWT size. Use independent KMS, rotation and key recovery planning, and compare to a private-storage design.
- **No strong immutability:** Service-role administrators can update \`app_metadata\`; code-only non-overwrite checks are *not* database-enforced immutability. Independent review must decide whether the user's "permanent original 10 words" promise requires a truly append-only external store / private Vault.
- **Auth persistence not proven:** SDK type support does not establish that one createUser API call is perfectly atomic across all GoTrue failure cases. Prove exact re-read and failure behavior on **separately authorized isolated tests** before deployment.
- **Identity collisions:** Aliases must be unique, and **existing username_links may already reserve some usernames with different emails**. An independent resolver/namespace migration review is required; no duplicate username creation.
- **Account takeover:** Admin API secrets must stay server-only; phrase login needs secure proof and rate limit; JWT \`aal2\` alone does not prove a session remains active after revocation.
- **No Production environment writes:** Do not enable previously hard-OFF Edge flags, change existing accounts' metadata, SQL/RLS, Vault schema, app UI, Cloudflare Worker/Secrets, GitHub release flags, or financial data.
- **Other user journeys:** Email/password, Google, existing MFA and old accounts remain unchanged.

## Review-only proof

\`\`\`sh
node --test security/n10-low-privilege-review/test-atomic-auth-escrow.mjs
\`\`\`

The test runs entirely in local Node WebCrypto with synthetic 10 words, tests correct encryption/decryption, owner isolation, tampering, fresh IV and fail-closed guards. It does **not** create an Auth user, test database durability, issue a JWT, or establish production security.

## Release decision

No migration retry. No "switch method to execute" before independent approval. If the alternative is permitted after security design review, request **separate** staging-only activation authorization and real signed E/F acceptance, followed by an independent Production release review and owner approval. Until then PR #74 remains Draft and N10 remains HOLD.

Sources: [Supabase Auth admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [Auth metadata](https://supabase.com/docs/guides/auth/managing-user-data), [Supabase Auth MFA](https://supabase.com/docs/guides/auth/auth-mfa), and upstream [AdminUserAttributes.app_metadata](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/lib/types.ts).
