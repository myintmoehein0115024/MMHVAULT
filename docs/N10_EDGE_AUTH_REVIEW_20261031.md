# N10 Edge Function production read-only review — 2026-10-31

Scope: **read-only** inspection of deployed production Edge Function metadata and source. No Edge deployment, auth switch or financial data change.

## Observed inventory
- `mmh-n10a769-username` v8 ACTIVE, `verify_jwt=false`. This is a public login/registration endpoint; JWT validation cannot be assumed from platform setting. Source includes Turnstile and rate control, and the password-login pathway calls Auth password verification.
- `mmh-n10a781-bind` v2 ACTIVE, `verify_jwt=false`. Source checks incoming Bearer token through `admin.auth.getUser`, performs Auth assurance-level evaluation and password proof; this compensating validation needs direct negative HTTP tests.
- `mmh-n10a783-phrase-verify` v2 ACTIVE, `verify_jwt=false`. Source checks bearer token via Auth getUser and uses a rate-limited phrase-verification routine; must test that the lack of automatic JWT enforcement does not allow unauthorized requests.
- `mmh-n10-a740-username` v8 ACTIVE, `verify_jwt=true`.

The initial comment in the username function describes a restricted qa_ pilot / cap of three; this is **not proof of a currently active three-account cap**. Verify the actual preflight and registration response behavior before claiming the cap is enforced or removed.

## Security implication
`verify_jwt=false` is **not by itself a vulnerability** for public login endpoints; security depends on the handler's token checks, rate limits, origin handling, captcha and database rules. Do not blindly change it to true: unauthenticated login and registration may break.

## Remaining release tests
1. Authorized Auth-issued AAL1/AAL2 tokens against actual private data, Storage and privileged RPC.
2. Unauthorized/expired/wrong-user requests against bound/recovery functions without disclosing secrets.
3. Branch login browser flows, then controlled migration/release approval.

Status: not fully certified for production MFA enforcement; no changes deployed.
