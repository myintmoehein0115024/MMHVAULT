# N10 real E/F Staging Auth preparation — acceptance 2026-11-04

**Authorized scope:** preparatory Staging-only private QA environment; no Staging Edge deployment, no Production changes, no PR merge, no A/B/C/D or synthetic E/F modification. **NOT real E/F registration or MFA acceptance.**

## Verified anchors
- `main` on preparation: `236e18d7bc0bb01283f4ea98a3432ba0003fca2c` (Landing L1.61); N10 PR #74 remained Draft, unmerged.
- Source: `security/n10-v2-qa/staging_real_ef_preparation_20261104.sql` and offline test `security/n10-v2-qa/test-real-ef-preparation-contract.mjs`.
- Supabase project: **Staging only** `ldivswlhtgmznzwhzsoi`, not Production `vrypucmyrztxgiqhjspd`.
- Applied migration **`20261104074837 n10_staging_real_ef_preparation_20261104`**, returned `success=true`.
- Separate isolated schema: `mmh_n10_realef_20261104`. Four private tables: `qa_gate`, `expected_identity`, `auth_bindings`, `backup_index`; 2 supporting trigger functions, 4 immutable/fresh-identity triggers.
- Two allowlisted test slots E and F: `n10real_e_20261104`, `n10real_f_20261104`. **Two slots are not two Auth accounts.**
- Immediately after migration: `qa_gate.enabled=false` with past expiry `1970-01-01T00:00:00Z`; `auth_bindings=0`, `backup_index=0` and **new real E/F `auth.users=0`**. No credentials, sessions, JWTs or Vault records were created.
- All four new private tables have RLS enabled; `anon`/`authenticated` and `service_role` have no direct table SELECT; neither trigger function permits direct EXECUTE by those roles. No private API was exposed.
- Two isolated negative tests passed in transactional PL/pgSQL exception blocks: unknown user cannot bind to E; attempt to alter E's allowlisted username fails with `42501`. After each rejected attempt, E/F bindings remained empty and both slot names unchanged.
- Old A/B/C/D baseline remained four `n10qa_%` rows with matching verifiers and encrypted backup-index rows; old synthetic E/F retained two encrypted backup index rows; its `qa_window.enabled=false`.
- GitHub static/offline CI on the new isolated contract: workflow run `41794753520` completed **SUCCESS** at preparation time, on commit `a067d1104d39763a0e24e3c6f3c72be93544ccdc`. The success is NOT signed Auth testing.

## Explicit limitations
- Supabase connector in this environment supports SQL, migrations, Edge functions and configuration, but **does not expose the Supabase Auth Admin create-user API**. It would be unsafe and unsupported to create `auth.users` records by direct SQL. Consequently **real E/F users have not been created**, despite this being authorized as part of preparation.
- A subsequent *separately authorized* Staging-only Auth administrative provisioning path or narrowly scoped temporary Edge deployment is required to create two real Auth identities through Supabase Auth API and to run actual AAL2 owner-bound Vault testing.
- The existing synthetic E/F schema is not a real Auth session backend. No migration, function or frontend here enables three-argument real Vault escrow or recovery reveal; these remain isolated and unreleased.
- Do not enable the hard-OFF QA gate, add public role grants, deploy Edge, change signup/password policy, merge PR #74, or run any Production change without the corresponding separate approval.
