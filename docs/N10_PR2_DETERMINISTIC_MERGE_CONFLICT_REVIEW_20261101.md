# N10 PR #2 — Deterministic three-way merge conflict review

Date: 2026-11-01 (Asia/Bangkok). **Draft-only read-only comparison**; neither `main` nor the Draft branch code was merged, rebased, reset or deployed by this review.

## Ref evidence
- Repository: `myintmoehein0115024/MMHVAULT`; Draft PR #2 `feature/n10-fixed-recovery-key-modal-20261031`.
- Common merge base: `06fa8f02d16bb04b17969af212f60f662a34819c`. Latest main at comparison: `1d2c012264a6ef3b7903461bc3f14a0e5d9f285f`. The Draft is **diverged** (140 ahead, 11 behind in the repository compare result); counts are history, not unresolved conflict count.
- PR #2 `mergeable=false`, `draft=true`, `merged=false`. The branch is **not** safe to merge merely because offline security CI is green.

## How overlaps were identified
A read-only line-level LCS comparison constructed two independent change sets: common-ancestor → main and common-ancestor → Draft. Base-overlapping edits with different final text were reviewed; exact identical edits were treated as nonconflicts. This is a conservative textual analysis, **not Git's actual `merge-tree` output** and not an executable merge.

### `login.html`
- Common base blob `512ebc116d37d43ec75622175f9e11ecc9f2bc44`.
- Both current main and Draft have **identical final blob** `89fac1d3a6ff0b8415d557707b8c953166591d53`.
- 4 overlapping base edits were byte-identical on both branches; **no divergent final content**. Preserve current main. No change required to login here.

### `js/mmhvault-n10-a7-83-security-center.js`
- Common base blob `81d5d8e4f2b5857753a580d20c5f4bfc3417b094`.
- Current main blob at comparison `7a7f69b3aa4c3ec8f68f5032d7b3ace75c912911`.
- There were 5 overlapping base change pairs, of which **3 pairs had identical added lines**. The remaining **2 divergences** lie in the account-security modal portal section:
  1. **Portal modal close** (at common-base insertion after line 283, about inserted block lines 151–152): main closes recovery with `hideKey()` and cancels pending MFA only when `pendingFactor` is present. Draft additionally calls `vaultStatusMode('unavailable')` and invalidates `mfaEpoch` even if `pendingFactor` has not been assigned. For future conflict resolution, **retain the Draft's fail-closed cancellation + recovery visual reset**, while carefully preserving any newer main styling/accessibility changes.
  2. **Portal modal open** (at common-base insertion after lines 285–287, extra line 14 in Draft block): Draft adds `if(section.id==='mmhA783Recovery')void loadVaultMode();`. Keep this **only with** the independent `N10_FIXED_VAULT_UI_RELEASED=false` and backend `RECOVERY_RELEASE_ENABLED=false` fail-closed guards. Never let that opening step call an unapproved production Vault endpoint.
- Additional Draft-only security code outside these textual overlaps includes `inspectTotpFactors(data.all)`, owner/epoch protections on enrollment and cancellation, server-verified factor + AAL2 before success, scoped verified factor removal, and 45-second secret auto-hide. These changes require their own functional review and must not be discarded by selecting the entire main file.
- This is a scoped **merge candidate** only. The common-base diff alone does not prove runtime compatibility or automatically resolve the Git PR conflict.

## Preserve unrelated latest-main updates
The main-only changes after the common base include Landing `index.html`, `app.html`, `sitemap.xml`, `email-templates/**`, and current Auth UI work. **Do not overwrite, delete or reset those files.** Any future merge must start from the then-current main, not the old common-base commit.

## Exact release gates (unchanged)
- Standalone N10 Staging A QA page still **LOCKED** `QA_RELEASED=false` and past deadline; earlier attempted reactivation was safety-denied and must not be bypassed.
- Staging A TOTP **unverified** on last authoritative DB audit; B not enrolled. Real AAL2 Auth proof still missing.
- Joint Staging Vault Edge OFF, empty allowlist and expired. Vault deletion E2E proof absent.
- Candidate production Vault Edge OFF, Draft UI Vault OFF.
- PR #2 remains Draft, no merge, no production deployment. Production finance records, RLS, Auth settings, `login.html`, `app.html`, DNS, secrets and production Edge are out of scope.

## Proposed next permitted work
1. Continue reviewing offline compatibility and unique Draft changes, especially account state changes and Auth callback asynchronous races.
2. If conflict resolution is later explicitly approved, prepare an **isolated merge candidate** against freshly fetched main, preserve all latest-main updates, run full CI and request owner review of the actual patch. Do not merge the PR automatically.
3. Real A-only MFA and Vault joint tests require an independently permitted path and authoritative Auth/DB evidence; do not imply release PASS from source checks.
