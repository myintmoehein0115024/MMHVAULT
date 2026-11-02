# MMHVAULT N10 · 合并预览 / Release Preview

**Status: DRAFT · Review Only · NO DEPLOY.** Updated 2026-11-02.

This branch contains a reproducible preview of the four existing N10 security
review PRs on public main `0c74182451dbdca3aa01ece5512697f33e3c87d3`.

| Source Draft | Included exact files | Running production effect |
| --- | ---: | --- |
| PR #11 · Vault backend | 25 | None; recovery release=false |
| PR #25 · App AAL/owner guard | 3 | None until merge; finance preserved |
| PR #31 · Username binding | 4 | None; enabled=false |
| PR #33 · Recovery-phrase verification | 4 | None; candidate release=false |
| Integrated provenance manifest, script, documentation and CI | 4 | Audits only |

**Exactly 40 changed files.** Original four per-PR CI workflow files have
been excluded so they retain their original exact-scope behavior. New integration
CI reuses their pinned tests and verifies the Git SHA of every copied source
file. No changes to `login.html`, browser username JS, public Landing,
business, Cloudflare, PWA, database schemas, RLS, financial records or account
secrets are intended. The App Auth code was copied from PR #25 only;
the integration checker separately confirms every non-Auth App byte equals main.

## Automated review gate

1. Reject branch drift or Git blob changes to the four approved review sources.
2. Reject any unlisted file, changes to public Landing, production login or
   financial/App non-Auth source, and any enabled backend release flag.
3. Run the original Vault MFA/session/key/SQL-contract suites, username binding
   synthetic runtime, recovery phrase synthetic runtime and App AAL/session
   synthetic tests from their **own frozen source worktrees**.
4. Type-check all disabled backend Edge candidates with Deno.
5. Run Chromium + WebKit desktop/mobile private-data masking tests against
   the integrated App candidate.
6. Require independently passing automated checks. These confirm code
   compatibility at review time, not real customer authentication.

## Production release remains HOLD

The running production username-binding Edge is not yet replaced and uses
pinned Supabase SDK MFA syntax incompatible with its stateless Auth client.
The newer code in PR #31 is deliberately OFF. A direct upload would either
remain disabled or require changing security-sensitive release controls.

The production saved-phrase Edge also runs a prior version. PR #33's copy
is OFF; the proposed fresh identity/MFA recheck is not live. PR #11's Vault
still needs production private-schema/RPC acceptance and cannot be deployed
just because synthetic tests pass.

Auth-Staging's old joint QA Edge retirement is still platform-blocked; do not
work around that restriction. The two existing Staging username synthetic
users have no verified MFA factors, so genuine signed AAL2 two-user acceptance
remains **NOT TESTED**. The owner prefers relying on automation; document
that as an acknowledged release limitation, not a passed live test.

**Decision rules**
- Green composite CI => **N10 consolidated automated REVIEW PASS**, not online.
- Backend release flags OFF => **NO-GO for production deployment**.
- Production deployment requires a bounded Edge-by-Edge plan, verified current
  function version/rollback, approved security gate resolution and fresh scope
  approval. Do not assume previous permission to draft code authorizes
  changing production database, credentials, RLS or financial data.
