# Transactions Onboarding V1 — Authorized Auth-Staging Preview

This is a **QA-ONLY** branch. Never merge this branch into `main`, the
production release PR #127, or an N10/Landing/Analytics project.

- Base tutorial candidate: `50897429deff0009f1c8a0c0a61afb63e77cffae`
- Database connection (QA only): `ldivswlhtgmznzwhzsoi`
- Cloudflare Pages project: `mmhvault-app-v117-staging`
- Required preview domain: `*.mmhvault-app-v117-staging.pages.dev`
- Browser CSP restricts connection to the Auth-Staging Supabase origin and self.
- Sign in **only with synthetic QA identities**. Never enter personal accounts.
- Do not import Production backups, CSV records, passwords or Recovery Keys.
- No Production Supabase access or database migration permitted.
- The tutorial may write owner-scoped settings into Staging only via the existing
  canonical APP operations during human acceptance.
- The tutorial UI itself performs no finance writes; no real transaction is
  necessary to finish the guide.

The Cloudflare project's previous branch control configuration was:
`preview_deployment_setting=none`, `preview_branch_includes=["*"]`,
`preview_branch_excludes=[]`.
Restore it immediately after a successful QA deployment.
