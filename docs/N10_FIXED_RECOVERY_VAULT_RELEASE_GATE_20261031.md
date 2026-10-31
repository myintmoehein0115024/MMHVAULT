# N10 Fixed 10-word Recovery Key — implementation and release gate
Date: 2026-10-31 · Development branch only, NOT a live backup service.

## Owner requirement
Each username-only account retains one fixed original ten-word key. A password prompt plus an authenticated AAL2 session (if TOTP enrolled) should allow secure re-view of the **same** phrase and locally reconstructed QR, not rotation.

## Successfully released frontend (GitHub main)
- `login.html` — Use Recovery Key on left / Forgot password? on right. Main commit `45fc5183e30cf82d82d5d810e4f79f283c6d5734`.
- `js/mmhvault-n10-a7-83-security-center.js` — Username, Recovery, Google and Authenticator detail sections now open modal overlays. Main commit `0d94cd34ea96eda6cc3c525534385ccb4b93bde3`.
- Pre-change main snapshot: branch `backup/n10-before-security-modal-20261031`.

## Implemented but NOT DEPLOYED
- `docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql`: private-schema index, encrypted Supabase Vault secret storage, immutable key replacement protection, privileged service-role-only RPCs, access throttling, delete cleanup.
- `security/n10-fixed-recovery-vault-candidate/index.ts`: verified JWT + server-side TOTP factors, password re-auth via isolated ephemeral session, original-phrase verifier cross-check, existing-key Vault store and password-protected reveal.
- `security/n10-fixed-recovery-vault-candidate/username-signup-integration-NOT_DEPLOYED.ts`: automatically escrow original generated phrase before completing new username signup; refuses incomplete signup if Vault backup fails.
- Candidate UI changes in development branch: existing-account one-time encrypted escrow with original phrase + password; later reveal with password only (TOTP-bound accounts must already be AAL2); secrets auto-hide in 45 seconds.

## Deployment blockers (MUST resolve)
1. The Staging SQL migration invocation was rejected by the execution safety gate, so **no migration was applied**. Do not work around the block by retrying through a different write interface; obtain a safe approved execution path.
2. Current auth Staging lacks the production `mmh_n10a769_recovery_phrases` table and production signup runtime. Prepare isolated QA rather than copying real recovery data.
3. No signed JWT / real password / error-path QA for this new Vault service. Static source checks are not substitutes for live acceptance.
4. Production permissions, Vault secret deletion, dual-login testing, enrollment/rollback and newly registered user backup must all be verified before deployment.
5. A one-way verifier cannot recreate a lost original key. Previously registered users must enter their original ten words **once** to opt into encrypted backup. A user who has already lost the original phrase cannot be shown that same phrase unless it was previously escrowed.
6. Encryption makes the original recovery key retrievable to authorized backend service code and privileged database operators. This is a deliberate confidentiality tradeoff versus the previous verifier-only design. Apply strict monitoring, no secret logging, MFA assurance, and narrowly granted roles.

## QA acceptance matrix
- Unenrolled user AAL1 + password -> original phrase only after Vault backup.
- Enrolled MFA AAL1 -> REST/Edge denied, even with correct password.
- Enrolled MFA AAL2 + correct password -> original ten words only; returned in no-store response; QR only in local browser.
- Wrong password, wrong words, expired JWT, mismatched UID, missing server factors -> no key returned; rate limits enforce 5 attempts / 15 minutes.
- Repeat backup same phrase -> idempotent; different phrase -> reject and retain original.
- Password change -> the escrowed phrase remains the SAME (Vault key independent from login password).
- Close modal, log out, navigate away or wait 45 seconds -> clear plaintext display and inputs.
- Owner deletes account -> Vault secret cleaned up with index.
- RLS and Vault permission audit: anon and authenticated execute privileges false; new private tables not in exposed public inventory.
- New username signup -> Vault secret stored transactionally before account creation reported successful; failure leaves no orphan accounts or secrets.
- Existing finance counts, transactions, receipts, RLS and DNS unchanged.

## Operational restrictions
No production SQL, financial rows, auth account record, MFA enrollment, or live Edge function changed as part of the Vault candidate.
Do not ask the owner to paste recovery words, passwords, TOTP setup QR or bearer tokens into chat.
Draft PR only: **do not merge until the full database and signed-token tests pass**.
