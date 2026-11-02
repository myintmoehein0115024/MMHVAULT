# MMHVAULT N10 username binding — fresh Auth / MFA review, 2026-11-02

**DRAFT / REVIEW ONLY / HARD OFF / NEVER DEPLOY WITHOUT FRESH APPROVAL.**

## Grounded read-only inspection
- Production Edge `mmh-n10a781-bind`, version **2**, is ACTIVE with `verify_jwt=false` because the endpoint itself validates the supplied Authorization bearer. Inspected its actual `index.ts` source through the connected project read-only; no secrets or user data accessed.
- Existing `currentUser(req)` invokes `admin.auth.getUser(bearer)`, validates confirmed real email, email identity and non-username-only account. Existing `requireAssuredSession(request)` calls `anon.auth.mfa.getAuthenticatorAssuranceLevel(bearer)`. **Version-specific mismatch:** the [new online docs](https://supabase.com/docs/reference/javascript/auth-mfa-getauthenticatorassurancelevel) show a JWT argument, but PINNED `@supabase/supabase-js@2.57.4` resolves to `@supabase/auth-js@2.71.1`, whose [tagged source](https://github.com/supabase/auth-js/blob/v2.71.1/src/GoTrueClient.ts) defines this method with **zero arguments** and reads the *local* session. The deployed stateless anon client never sets that session. The resulting extra-verification rejection is a code-level likely UX issue, not a live reproduced failure.
- Existing code checks MFA and then performs asynchronous rate quotas, CAPTCHA verification, database lookup and password reauthentication before a privileged `admin.from('mmh_n10a740_username_links').insert(...)`. There is **no fresh bearer/MFA check immediately before INSERT**.
- This is a **potential delayed-auth/verified-factor race**, not evidence of compromise or cross-user alias binding. The table's unique constraints prevent duplicate username and duplicate per-user links. The current source's other controls should remain intact.

## Candidate only
- Copy the inspected source to `security/n10-username-bind-candidate/index.ts` with `enabled=false` hard-off. Do not replace the deployed function.
- Before the privileged insert, independently revalidate the original token's real Auth user ID, confirmed email and MFA assurance. Reject changed/invalid owner, email, unverified MFA, or unavailable Auth verification. The pure helper is in `bind-guard.mjs`.
- The exact race between a final check and the database commit cannot be fully eliminated without an owner-approved session-aware transactional backend design. Do not claim strict live revocation is guaranteed by this candidate.
- Offline tests include a default-off endpoint, normal binding, newly required MFA during password proof, owner switch, and revoked user. Synthetic VM *only* flips `enabled=true` to test the copied handler; no real network, accounts, Supabase calls, passwords, or new user records.
- Tests enforce an exact five-file allowlist and reject file overlap with latest main. Production `app.html`, `login.html`, Landing, finance, Supabase Auth/DB/RLS and deployed Edge remain unchanged.

## Release blocks
1. Independent code/security review and check against current production Edge version.
2. Legitimately unblock the prior Staging QA limitation (do not bypass platform restrictions).
3. Authorized real signed account binding with and without MFA, negative-owner cases, existing username uniqueness, CAPTCHA failure and session-revocation checks.
4. Fresh owner approval **specific to the production binding Edge replacement**, including rollback. Never infer deploy approval from an isolated CI pass.

## 2026-11-02 offline QA expansion and current-main sync
- Confirmed current [Supabase JS MFA AAL docs](https://supabase.com/docs/reference/javascript/auth-mfa-getauthenticatorassurancelevel) explicitly support the JWT parameter in server-side Edge environments. The deployed AAL method call is not a misuse by itself.
- Extended pure final-authorization tests to **10** denied/allowed cases and full synthetic handler scenarios to **12**, plus a separate hard-OFF test. Includes quota rejection, invalid CAPTCHA/password, alias already linked, conflicting alias, unavailable MFA and Auth identity, new MFA enrollment, and AAL2-verified success. All remain **synthetic** without real tokens/users/Edge requests.
- Added Deno type-check of the disabled Edge handler to the review-only GitHub Actions workflow. This validates source syntax/types only, not live Supabase integration.
- Based this Draft-only review atop current public `main` `4cac394` with no intersection between the latest Landing changes and five N10 new review paths. No production, Staging, account, finance or real Edge write.


## 2026-11-02 root-cause correction and review-only candidate
- The Deno type-check identified `TS2554` at `getAuthenticatorAssuranceLevel(jwt)`. Tagged `@supabase/auth-js@2.71.1` source confirms the JWT parameter is ignored, despite a newer documentation example. **Earlier review documentation calling this valid for the deployed version was incorrect.**
- Updated only the **disabled** candidate: server verifies the exact original bearer via `admin.auth.getUser(jwt)`, loads current MFA factor enrollment via `admin.auth.admin.mfa.listFactors`, then checks subject, issuer, expiration and AAL in that Auth-verified JWT. Both first and last pre-insert checks fail closed if Auth, factors or AAL are missing. The Auth server verifies the token signature; the pure evaluator does **not** cryptographically authenticate decoded bytes itself.
- Added 10 synthetic JWT/factor cases on top of 10 pure and 12 handler cases. All JWT strings in tests are invented/unsigned and used only with fake Auth responses. Deployed Edge remains unchanged, and `enabled=false` still blocks the review copy.
- As before, no test proves immediate access-token revocation on signout or zero race after the final read; production deployment requires independent signed tests and explicit approval.
