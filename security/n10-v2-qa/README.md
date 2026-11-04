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
