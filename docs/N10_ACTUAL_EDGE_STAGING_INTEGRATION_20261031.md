# N10 — Three actual Edge candidates on isolated Auth Staging
Date: 2026-10-31 · **Staging deployed; real signed-JWT positive/negative acceptance PENDING.**

## What was actually deployed
All three QA functions were assembled from the N10 candidate `index.ts` and helper source in the feature branch, not manually re-implemented from scratch. The only edits bind the services to Auth Staging and insert a QA-only early return **after actual authentication/MFA checking and before any private data read or external side effect**.

| Actual candidate | Staging-only QA slug | v | JWT gateway | Next external side effect gated |
|---|---|---|---|---|
| `mmh-financial-assistant` | `mmh-n10-qa-ai-integration-20261031` | 1 ACTIVE | true | transaction/investment reads and AI provider call |
| `mmh-push-test` | `mmh-n10-qa-push-integration-20261031` | 1 ACTIVE | true | push subscription queries, VAPID lookup, notification send |
| `mmh-n10a783-phrase-verify` | `mmh-n10-qa-phrase-integration-20261031` | 1 ACTIVE | false | username/phrase lookup, HMAC proof, rate-limit RPC |

Each service uses only `ldivswlhtgmznzwhzsoi`, returns `MFA_ALLOWED` plus `qa_only:true` after a valid AAL2 decision, and cannot read real production records or interact with production Edge. Each MFA helper is byte-identical to its N10 feature-branch counterpart. These safety properties were verified by inspecting every deployed staging candidate source.

The three deployed staging source trees are in the independent `myintmoehein0115024/MMHVAULT-Auth-QA/n10-edge-integration/` directory. The source is intentionally nonproduction.

## Corrections during integration review
- Financial Assistant candidate had an AI provider key availability check **before** its login/MFA check. It was moved behind successful MFA enforcement so no configuration state is disclosed to unauthenticated callers. Feature-branch GitHub static and browser checks passed after this change.
- Push JWT parsing now uses the separately tested `parseVerifiedBearerClaims` helper, fixing the earlier literal-backslash Bearer regexp.
- All three MFA checks deny unknown factor state; AI and recovery-phrase endpoints never guess that missing user factors means no enrollment.
- Stage 05 of `MMHVAULT-Auth-QA/n10-mfa-stage.html` now runs **six genuine Auth-issued AAL1/AAL2 requests** to these three actual-candidate QA functions. Earlier 17 synthetic data/RPC/Storage/Edge tests are not repeated.

## What has passed
- Three Supabase stage deployments returned `ACTIVE`. Gateway `verify_jwt` settings match the reviewed production versions (true/true/false).
- All three source packages contain explicit staging-only guards and their QA early-return statements precede the first private activity. Helpers match feature branch byte-for-byte.
- Browser panel JavaScript syntax checked and button hidden behind verified AAL2.
- GitHub feature branch checks after AI configuration-order fix: **success** (static and browser).

## What has NOT passed yet
- **The new Stage 05 real-token 6/6 test has not been run by the user and no 6/6 result is claimed.** ACTIVE deployment proves upload/build readiness, not correct Auth factor SQL/SDK behavior at runtime.
- The Push test still relies on Staging `SUPABASE_DB_URL`; if this variable is unavailable, test may return a server error. Inspect the function logs rather than weakening the gate.
- Recovery-phrase candidate needs Staging service-role env for validating bearer but the QA cut-off prevents using any recovery phrase or permanent HMAC secret.
- These no-side-effect Staging functions are not full exercise of provider responses, notification delivery, or real recovery-phrase verification. Those are separate approved integration tests.
- Production's original Edge versions remain unchanged, and PR #1 remains Draft/unmerged.

## Minimal user QA, only if needed
In the isolated Staging QA page, login with an existing **Staging test account only**, verify six-digit TOTP, then click **05 · 验证实际 Edge · 6 项**. Expected AAL1 result is HTTP 403 and AAL2 HTTP 200 for each of the three functions. Send only the result text/screenshot, never passwords, TOTP, QR, signed tokens or recovery phrases.

**Release decision remains HOLD** until real Stage 05 test, final production dependencies and explicit scoped production authorization.
