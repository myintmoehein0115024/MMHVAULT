# N10 V2 E/F isolated Staging database rehearsal — 2026-11-04

**Owner approved:** Staging-only isolated V2 database testing with synthetic E/F; no mutation to A/B/C/D, Production, finances, APP V11 or Landing. The schema is `mmh_n10_v2qa_20261104`; no real `auth.users` accounts are created here.

- All schema objects are new and private; no existing tables, RPCs, RLS policies or login configuration are changed.
- Preflight rejects Production-like environments: original A/B/C/D QA prerequisites from Staging must exist, the old two-argument RPC must exist, and the proposed three-argument public RPC must be absent. No actual BIP39 words or real identity keys are used.
- Exactly two synthetic fixture rows E/F, isolated with FK ownership and fixed HMAC-shaped verifier placeholders. The verifier test checks *matching the stored value*, not cryptographic HMAC authenticity (that still belongs to the real Edge).
- A 3-argument `backup_put` exercises Vault encryption, immutability, owner lock, no prior session/username link. `recovery_matches` exposes a boolean only and simulates AAL2, owner identity and session revocation for E/F; it is **not** live JWT or real authenticator validation.
- Access via a private schema, RLS enabled with no client policies, no direct table grants, and service-role-only function EXECUTE. The test window expires **2026-11-04 16:00Z** (23:00 Bangkok). After automated tests, switch `qa_window.enabled` to false; keep synthetic records to inspect without touching any real users.
- This isolated rehearsal DOES NOT modify the existing Staging V1 RPC or close/reopen any legacy C/D Edge; it does not deploy an Edge or public preview page.
- If clean-up is later approved, delete the synthetic Vault secrets by their distinct `mmh_n10_v2qa_20261104_*` names with a separately verified Staging-only plan before dropping the QA schema. Never delete any A/B/C/D secret.
- Next: source-verified SQL migration in Staging, readback of private ACL and E/F rows, differential E/F integrity tests, then close. Real E/F registration through Auth and MFA is a separate end-to-end gate and not claimed by this fixture test.

## Completed automated E/F Staging verification — 2026-11-04

**Actual live Staging facts (not Production):** `mmh_n10_v2qa_20261104` migration applied successfully. Private function ACL inspection confirms exactly three service-role-only methods, no anon/authenticated EXECUTE, and seven isolated RLS tables without client policies. Exactly two synthetic owner/verifier/link rows, two simulated verified AAL2 sessions, two encrypted Vault secrets and two private backup-index rows; A/B/C/D each retain original link/verifier/encrypted backup (four each).

**Positive and negative tests:**
- Simultaneous E initial writes with different synthetic word strings: one committed; other rejected `42501 Fixed synthetic key immutable`; **exactly one Vault secret for E**.
- F attempted E's verifier: rejected `42501`; F's own verifier: accepted.
- E/F identical-word retry before login/link: accepted without new Vault entries; different-word retry: rejected `42501`.
- Each of E/F using simulated verified AAL2 session: recovered exact original boolean match; E→F and F→E, incorrect session and incorrect words: all false. No plaintext returned.
- Any backup_put after first simulated session/link: rejected `42501` (no silent backfill).
- E session revocation: viewer false; restored simulated session: viewer true.
- Rate limiter: first two accepted, third blocked for a two-attempt quota.
- A further synthetic banned-owner toggle was **not executed** because the connector safety check blocked it; the code still contains a denial predicate, but live ban behavior is NOT claimed as tested.

**Hard closure:** at completion updated only isolated `qa_window.enabled=false`. Verified `recovery_matches` returns false, `backup_put` and `take_attempt` reject with `42501 N10 isolated V2 QA is closed`. No E/F password, actual Supabase Auth user, JWT, TOTP or real browser session exists. Old V1 Staging functions and E/F encrypted synthetic fixtures remain intact for safe review. Do not call this end-to-end MFA QA.

The SQL file is an independently reviewed staging-only fixture; the added Node contract test is OFFLINE ONLY and must never deploy or invoke it.
