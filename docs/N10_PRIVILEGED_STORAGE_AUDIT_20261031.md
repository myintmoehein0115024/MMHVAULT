# N10 — Additional server-side security findings (2026-10-31)

Status: read-only audit; no production changes.

- In the production project, the three Storage buckets `receipts`, `mmh-feedback`, and `mmh-business-assets` all have `public=false`. This does not prove MFA enforcement: authenticated object operations, signed URL issuance, and already-issued signed URLs remain test requirements.
- Production `public` has ten `SECURITY DEFINER` functions in the catalog inspection. Exactly one was callable by the `authenticated` role: `mmh_delete_crypto_wallet_movement_v4(p_id uuid)`.
- The wallet deletion RPC is an explicit conditional-MFA authorization gap candidate: prior source inspection confirmed UID owner checks but no AAL check at function entry. Protect the function directly; a restrictive RLS policy on underlying tables might be bypassed by the definer execution context.
- Rechecked staging cleanup: the isolated `mmh_n10_mfa_qa` schema count was zero.
- The earlier synthetic tests were SQL JWT-context simulations, not validated HTTP token tests; no real enrolled MFA factor, Storage route, or privileged RPC endpoint has yet passed the required server E2E authorization tests.

Release remains blocked until signed-token, private Storage and RPC negative and positive tests pass in isolation, followed by explicit production deployment permission.
