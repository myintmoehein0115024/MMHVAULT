# N10 fixed recovery — Staging signed-JWT QA plan and completed results

> **Current status (2026-10-31):** Part of this plan WAS executed. Two freshly created, email-confirmed synthetic test users A/B (not the older username QA users) passed owner-observed signed login, synthetic ten-word generation, encrypted-backup/reveal happy path, wrong password rejection on reveal, old bearer refusal after logout, and 45-second UI disappearance. **Both users were manually deleted and confirmed absent in Staging.** The temporary recovery Edge is now a secretless HTTP 410 retired stub with `verify_jwt=true`, not an active recovery service. The QA page is a static closed notice. The owner reports deleting the Staging-only QA HMAC Secret (not independently verifiable via this connector).
>
> **Open release blockers:** No tests with an Auth account enrolled in MFA; the two new A/B users and two older Staging username-only accounts had no MFA factor records at inspection. AAL1-denied/AAL2-allowed after verified TOTP remain **UNTESTED**. Direct sensitive Vault index/ciphertext/orphan inventory was blocked by safety controls, so post-deletion Vault cleanup is **UNVERIFIED**, not PASS; do not bypass. Existing PR #2 remains Draft/unmerged; production untouched and V11 on hold. The original plan below captures pre-test preparation, not the current runtime status.

2026-10-31 · MMHVAULT Auth Staging only · `ldivswlhtgmznzwhzsoi`

## Current baseline (read-only, verified)
- Two existing **older** QA accounts have `app_metadata.mmhvault_auth_kind='username_only_staging'`, two username links and two older `public.mmh_n10a763_recovery_phrases` verifier records. They are **not** accepted as backed-up original words for the new Vault feature.
- New Vault test-only verifier `public.mmh_n10a769_recovery_phrases` has 0 rows. The private Vault index, rate bucket and candidate Vault secret prefix currently have 0 records.
- Two approved Staging SQL migrations installed the schema and passed ACL/RLS structural checks. They did **not** prove a real successful secret put/get, live-session revocation, or deletion cascade behavior.
- Existing Staging QA signup Edge uses a **different** HMAC namespace and verifier table. Never reuse its old recovery words as if they were newly backed up. It is also pinned to its own CAPTCHA requirements and backend.
- Review-only `security/n10-fixed-recovery-vault-candidate/qa-staging-recovery-NOT_DEPLOYED.ts` is hard-pinned to exactly this Staging project and GitHub Pages QA origin. The file is **not deployed**; `RECOVERY_RELEASE_ENABLED=false`.
- The Staging adapter additionally requires two explicitly allowlisted synthetic user UUIDs (environment `N10_FIXED_RECOVERY_QA_UID_ALLOWLIST`), a separate Staging-only `N10_FIXED_RECOVERY_QA_HMAC_KEY`, `qa_`-prefixed usernames and Auth-owned `username_only_staging` metadata. The adapter must **never** accept regular users or production-origin traffic.

## Before enabling *any* QA backend
1. Explicit operator approval for **synthetic-only** Auth user creation, one dedicated QA Edge deployment with `verify_jwt=true` or an equivalent documented verified-bearer gate, Staging-only secrets, controlled temporary release switch and full teardown. The prior authorization to install two SQL migrations is not a production/deployment authorization.
2. Confirm isolated QA page origin and Turnstile hostname/action configuration; do not disable CAPTCHA or copy production secrets as a shortcut.
3. Create **two new synthetic QA accounts A/B** with random passwords and generated ten words never shown in chat, logs or screenshots. Establish one-to-one UID/username and original-phrase one-way verifier under the Staging-only HMAC key before testing backup. Never alter previous QA accounts' original recovery words.
4. Narrow the Staging Edge test to these two UIDs with `N10_FIXED_RECOVERY_QA_UID_ALLOWLIST`; assert release OFF until the Staging reviewer approves a short, controlled test.
5. Obtain true Auth-signed JWTs for A and B through Staging login (not fake unsigned JWTs). Verify `auth.sessions` row binding, owner UID, and valid AAL.

## Required end-to-end acceptance matrix
| Test | Required result |
| --- | --- |
| AAL1 no enrolled factor + correct password + true original ten words | A's new Vault record encrypted and retrievable after successful backup |
| AAL1 with enrolled factor | 403 MFA_REQUIRED; no secret, even with correct password |
| AAL2 with verified factor + correct password | May reveal exactly A's original ten words only |
| A's signed bearer against B's state | Never returns B's phrase; account IDs must be server-owned |
| Expired/malformed/forged JWT, missing server factors | Reject; never return phrase |
| Password invalid / changed password / sign-out | Reject or require new proof; logged-out old session cannot reveal |
| Five password-proof tries shared across backup and reveal | Sixth request inside the 15-minute window gets 429; absent quota RPC fails closed |
| Idempotent backup same original words | Does not create a second Vault secret |
| Different ten words after backup | Reject; original encrypted record remains unchanged |
| Async modal close, tab hidden, account switch, logout, 45 seconds | Sensitive words/QR/password removed and late responses discarded |
| Delete one synthetic account | Associated encrypted Vault secret and verifier row removed via trigger/FK; B unaffected |
| Forced signup Vault failure / failed Auth cleanup | No successful account; orphan remediation and record checks performed |
| RLS and RPC ACLs | Anon/authenticated cannot call privileged RPCs, read private tables, or read each other's records |
| Rollback simulation | No orphan secrets; stop if inventory or trigger cannot prove cleanup |

## After QA
1. Set the QA Edge release flag OFF and remove/disable test-only Edge deployment; revoke Staging-only credentials as appropriate.
2. Explicitly sign out and delete the newly created *synthetic* A/B accounts through the approved Auth administration flow. Never delete legacy QA or production users.
3. Count candidate index rows and the candidate-prefix Vault secrets; confirm zero and verify trigger function behavior. If any nonzero orphan exists, STOP for targeted remediation—never blanket-delete Vault.
4. Re-run read-only RLS/ACL checks, confirm production schema and finance records untouched, record actual findings separately from planned results.
5. Review Staging's preexisting QA `SECURITY DEFINER` warning and leaked-password protection notice for the later N10 security cleanup.
6. Keep GitHub Draft PR #2 unmerged; production N10 and V11 remain off until signed-JWT and production-owner acceptance.

**No credentials, plaintext phrases, bearer tokens or TOTP secrets belong in this document or the chat.**
