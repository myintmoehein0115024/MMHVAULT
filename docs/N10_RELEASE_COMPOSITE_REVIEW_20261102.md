# MMHVAULT N10 · 合并预览 / Release Preview

**Status: DRAFT · Review Only · NO DEPLOY.** Updated 2026-11-02.

This branch contains a reproducible preview of the four existing N10 security
review PRs on public main `0f86cb363b78d92ab7d154ac36a502f396ae1444`.

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



## Stage 1 — existing login and username linking (PREPARED, NOT DEPLOYED)

**Order:** first fix the existing username binding Edge, then activate the App
Auth/AAL UI guard, then pause to verify. Keep saved-phrase verification and
Vault isolated for later phases. Existing username/email/Google sign-in must
remain fully usable throughout this stage.

### Read-only production baseline, 2026-11-02

| Runtime | Running version | Source SHA256 | Replacement |
| --- | ---: | --- | --- |
| `mmh-n10a781-bind` | v2 | `a64eb4e33110a248b0f84e42d80a1d9dc9241e526508c1ea1323db6500c427dc` | Proposed: PR #31, hard-OFF review candidate only |
| `mmh-n10a769-username` | v8 | `238d1cf1b92440501e82e6a0b2fb3ea827f4168c3bb190ab5863930f850d6057` | None, must remain unchanged |
| `mmh-n10a783-phrase-verify` | v4 | `bf46fc4db6496d41fba9b4828a96f4342f8315d704e6e1ea39da24960737360d` | Deferred until next phase |

Binding source v2 uses `getAuthenticatorAssuranceLevel(jwt)` against a
stateless older pinned SDK; the review candidate instead rechecks the bearer
with Supabase Auth and the server-owned verified MFA factors before privileged
writes. This is a **code compatibility finding**, not an actual signed
production failure reproduction.

### Database access protection — checked read-only

- `public.mmh_n10a740_username_links`: **RLS enabled**, zero direct user RLS
  policies (thus default-deny for normal roles); no `anon` table grants.
- Unique indexes on both `username_key` and `user_id` protect against
  duplicate binding; existing rate-limit RPC is installed.
- The existing service-role binding Edge uses a privileged client and must
  retain *both* Auth identity checks and CAPTCHA/rate controls. RLS alone is
  not sufficient to protect a privileged Edge.
- No user data, passwords, tokens, or key phrases were queried.

### Required controlled production checklist, not yet executed

1. Re-read the **live** Edge sources, flags, `verify_jwt`, function versions
   and all three SHA256s immediately before any write. Abort if any baseline
   changes; do not overwrite newer backend fixes.
2. Save the exact original binding v2 source files and verify rollback before
   a replacement; isolate the change to this one Edge. Never copy a hard-OFF
   candidate to production and accidentally disable working binding.
3. Keep API responses, CORS, CAPTCHA, rate limits, account ownership and
   uniqueness backward compatible; run applicable offline safety suites and
   verify no finance/Landing/code changes.
4. Conduct authorized staging or equivalent genuine signed negative/positive
   checks where permitted. The missing real AAL2 two-account evidence is a
   residual security risk; automation alone does not prove it away.
5. Request a **specific approval for replacement of production binding Edge**,
   including whether residual signed-test limitations are accepted.
6. After authorized deploy: verify endpoint version and safe functional path;
   on identity, MFA, error rate or availability regression, redeploy the
   captured v2 source, verify its exact SHA and stop release. Do not touch SQL,
   Auth accounts, Vault or financial records in this rollback.
7. Only after binding's independent checkpoint, consider App Auth guard,
   with its own allowed `app.html` Auth-section diff, browser privacy checks,
   GitHub Pages build and a single-revert rollback. Finance and Landing
   source must be unchanged.

**Current status: source verification green; production first-stage rollout
NOT approved or executed.** The approval to prepare this phased plan does not
open the protected production release gates. Stage 2 (phrase verifier / Vault)
must wait for its own evidence and approval.
