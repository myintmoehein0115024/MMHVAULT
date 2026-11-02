# N10 saved recovery phrase verification — final-session review

**DRAFT ONLY. NO EDGE DEPLOYMENT. DEFAULT HARD OFF.**

## Observed production source (read-only)
- Production `mmh-n10a783-phrase-verify` is **ACTIVE v4** with `verify_jwt=false` and manual bearer verification through `admin.auth.getUser`. Despite comments saying "not deployed", this version is deployed according to its Edge metadata.
- Source checks user and MFA at request entry, then performs an awaited username DB read for `status`, or HMAC/quota and phrase verifier DB reads for `verify_saved_phrase`. Neither branch previously checked the original user's token/factor enrollment immediately before revealing the result.
- Its existing MFA helper treats missing AAL as AAL1 for older tokens and allows stale AAL2 with no verified factor. The tightened **review-only** helper requires explicit assurance, and requires newly verified MFA to have a matching AAL2.
- Its original `req.text()` reads an unbounded streamed body before checking string length. A bounded 700-byte stream reader avoids allocating the entire request.
- These are code-level hardening findings, **not evidence of a proven user exploit**, and say nothing about a live token revocation guarantee.

## Isolated candidate only
- Copies the real deployed index.ts into `security/n10-phrase-verify-candidate/index.ts` with `CANDIDATE_RELEASE_ENABLED=false`; never replace the running Edge under this PR.
- Uses the stricter source-only MFA helper from the independent Vault PR #11, validating the exact original JWT only AFTER the service-role Auth API has authenticated that bearer. Re-fetches user and server factors immediately before returning `account_status` or `phrase_verified`.
- Uses a streaming 700-byte body limit. Rejects invalid bearer, cross-owner switch, newly enrolled MFA, unknown assurance, or temporarily unavailable Auth factors (fail closed). Returns existing safe error categories.
- Synthetic tests use invented unsigned tokens and fake HMAC phrases. The VM has no actual network requests or user accounts and cannot establish real signed Auth, same-owner isolation, or actual post-revocation enforcement.

## Release restrictions
- Requires independent code review, explicit comparison to currently deployed function checksum, valid Staging test authorization, real signed dual-account AAL1/AAL2 and 10-word tests, and fresh production deployment-specific approval.
- Old Staging joint QA safety block must not be bypassed. No production Auth, App, RLS, finance or user data modifications.
