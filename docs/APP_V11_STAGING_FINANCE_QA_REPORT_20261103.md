# APP V11.7 — Auth-Staging finance sandbox deployment and SQL owner QA

Date: 2026-11-03 (Thailand UTC+7). **Staging only; not Production.**

## Explicit user approval

Owner approved creating **only two empty finance test tables** inside
`MMHVAULT-Auth-Staging` (project `ldivswlhtgmznzwhzsoi`) and testing
synthetic A/B account isolation. Production and all existing N10 records,
tables, SQL, MFA/Recovery endpoints, settings and secrets were out of scope.

## Deployment performed

Migration applied successfully:
`app_v117_staging_finance_sandbox_20261103`.

Created only:
- `public.transactions` — production-compatible minimal ledger columns,
  owner UUID FK, explicit transaction ID, date/type/category/accounts/amounts,
  no imported records.
- `public.personal_configuration` — per-owner `config jsonb` plus
  language/timezone/`updated_at` compare-and-swap timestamp.

Both tables have **RLS enabled**, with **seven policies in total**:
four for transactions (owner SELECT / INSERT / UPDATE / DELETE) and three
for config (owner SELECT / INSERT / UPDATE). No `anon` table SELECT grant.
Auth user editable metadata is not used as a security predicate.

A preflight confirmed both tables were absent before applying the migration.
The DDL contained a transaction-wide guard that aborts if either exists.
No N10 table migrations, backend deployment or production access was used.

## Staging A/B SQL identity-isolation verification

The QA reused two **existing** staging Auth test identities solely as
foreign-key targets and to simulate `authenticated` database-role claims
(`SET LOCAL ROLE authenticated` plus `request.jwt.claim.sub`).
It never registered or modified Auth users or N10 QA tables.

Tests ran in an explicit `BEGIN ... ROLLBACK` transaction using only
temporary finance rows; **no permanent test transactions/config rows**.

Verified:
1. Owner A can insert and read only A's transaction and JSON config.
2. Owner B can insert/read only B's transaction and config.
3. A inserting a B-owned transaction is rejected by RLS.
4. B inserting A-owned configuration is rejected by RLS.
5. B reading A's transaction/config yields zero rows.
6. B updating/deleting A's financial transaction yields zero rows.
7. B updating A's config yields zero rows.
8. Owner-scoped config compare-and-swap accepts the current timestamp,
   rejects the old timestamp (zero affected rows).
9. Archived Category remains archived, while the original
   `Type → Transaction → Category` transaction-ID sidecar survives.
10. Synthetic ledger record remains associated with the correct owner.

## Post-test proof

- `public.transactions`: **0 rows**.
- `public.personal_configuration`: **0 rows**.
- Both table RLS flags: **true**.
- Total finance policies: **7**.
- Existing `mmh_n10*` and `mmh_p995*` staging public tables: **15**,
  identical to before.
- No user records, N10 secrets, production data, or historical finance
  transactions were changed. Synthetic test writes rolled back.

## Scope and remaining release gates

**SQL-role claim simulation is not a genuine signed-in Supabase Auth JWT
session.** It tests actual database RLS policies under a simulated role/UID,
not a real app request; the testing source uses pre-existing staging users
without their passwords/tokens.

Still required before production:
- A real Auth-Staging front-end preview bound only to the staging API
  (never Production), with two test accounts actually signed in.
- Owner A/B browser insert and signed data readback on a second device.
- Failed-network/retry + concurrent writer conflict tests against Staging.
- Original old-account historical ledger isolation and Archive/Restore.
- iPhone Safari, Android and desktop responsive QA.
- Reconciliation review of overlapping Draft PR #85 and fresh current main.
- Separate explicit user approval before any production merge/deploy.

The original tested V11.7 candidate code remains in Draft PR #87.
**No actual app preview or real signed user flow was deployed in this step.**
