# MMHVAULT N10 — Binding Edge production rollout, 2026-11-02

**Scope:** Only Supabase production project `vrypucmyrztxgiqhjspd`, Edge
`mmh-n10a781-bind`. The owner explicitly approved this single-function
controlled fix in chat after N10 staged automated review.

## Before deployment

- ACTIVE v2, `verify_jwt=false`, SHA256 fingerprint
  `a64eb4e33110a248b0f84e42d80a1d9dc9241e526508c1ea1323db6500c427dc`.
- Original complete `index.ts` was fetched read-only, stored at
  `security/n10-binding-v2-rollback-20261102/index-v2.ts` on this branch,
  then compared byte-for-byte with the unchanged running v2 immediately before
  deployment. Git blob: `92712ac865648785ba8016322e567612ff48898f`.
- CI review PR #37 `7d6e7572`: provenance + all source tests + browser
  privacy and finance regression succeeded. Release candidate uses PR #31's
  exact reviewed binding source and helper, changing only the binding
  `enabled=false` review flag to `enabled=true` for this permitted service.
- Pinned `auth-js` MFA signature mismatch fixed using verified original
  bearer `getUser`, server-owned factor inventory and final pre-insert
  identity/MFA recheck. CAPTCHA, rate limits, uniqueness, origin and
  password proof remain in force.

## Verified post-deployment

- **ACTIVE v3** at the same `mmh-n10a781-bind` endpoint, with
  `verify_jwt=false` as before.
- New Edge SHA256 fingerprint:
  `af87a20046e0a1a857f43ec45ef12fe8acf659345c8544adcd44d83fd98a20a2`.
- `get_edge_function` returned both exact reviewed deployed files,
  `index.ts` and `bind-guard.mjs`, with `enabled=true`.
- The untouched live auth services were independently re-read:
  `mmh-n10a783-phrase-verify` remains ACTIVE v4 and
  `mmh-n10a769-username` remains ACTIVE v8, with their original fingerprints.
- No GitHub main, App UI, Landing, finance, SQL/RLS, Auth user data,
  other Edge functions, or secrets were modified.

## Limitations and rollback contract

- **This proves successful source deployment and live metadata, not a
  genuine signed user's completed username bind.** Such tests were not
  executed; do not mark end-to-end MFA/owner isolation PASS.
- If live binding fails, verify the v3 fingerprint first; only when it still
  matches the expected deployed version, restore the exact v2
  `index-v2.ts` with `verify_jwt=false`. Recheck v2 availability,
  metadata and SHA. Never downgrade if another authorized change superseded
  this version; stop and reconcile before rollback.
- PR #37 remains DRAFT (composite source and tests). Its disabled candidate
  copies must **not** be uploaded as-is, and its source merge is not necessary
  for this single Edge rollout. N10 App, Vault and phrase changes still need
  independent scoped approval.
