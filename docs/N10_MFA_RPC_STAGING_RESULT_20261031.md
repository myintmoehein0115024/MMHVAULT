# N10 MFA synthetic data + privileged RPC isolated execution — 2026-10-31

**Scope:** Approved isolated Auth Staging project `ldivswlhtgmznzwhzsoi` only. No production database, functions, website, or authentication switch modifications.

**Pre-test snapshot:** Existing `public` tables = 11, existing `public` policies = 3, verified real MFA factors = 0, `mmh_n10_rpc_qa` schema absent.

**Synthetic test setup:** Non-exposed `mmh_n10_rpc_qa` schema with a synthetic table, fixture factor table, RLS ownership policies + restrictive MFA guard, a `SECURITY DEFINER` MFA-checking deletion RPC, and `SECURITY INVOKER` mutation test helpers. Fixed synthetic UUID identities with MFA fixture enabled/disabled. SQL sessions used `SET LOCAL ROLE authenticated` and simulated `request.jwt.claims`; no actual Auth-issued tokens were used.

Each test was individually wrapped in an SQL transaction and **ROLLBACK**. Results observed:

| Simulated state | Own SELECT | INSERT | UPSERT | UPDATE | DELETE | Privileged DELETE RPC |
|---|---|---|---|---|---|---|
| MFA enrolled / AAL1 | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |
| MFA enrolled / AAL2 | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| MFA not enrolled / AAL1 | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| MFA enrolled / missing AAL | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |
| Different UID / AAL2 | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |

Helper returned explicit FALSE for enrolled AAL1, missing AAL, and no MFA-step cases; conditional checks were implemented with `coalesce(..., false)`.

**Cleanup:** Approved temporary QA schema dropped. Post-test count: QA schema = 0, existing public tables = 11, existing policies = 3, verified MFA factors = 0. Existing Auth staging tables and real user records unchanged.

**Important boundaries:** PASS only for these SQL-context synthetic checks. No Auth-issued signed AAL1/AAL2 JWT requests, real-user sessions, Storage signed URLs, public REST routes, or production wallet RPC were tested. Storage and RPC production patches are draft-only and require additional signed-token end-to-end validation, deployment plan, authorization and rollback. Do not interpret simulated results as full release clearance.
