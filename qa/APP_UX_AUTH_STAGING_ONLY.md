# APP V11.7 UX stability — Auth-Staging-only composite QA

Do not merge this QA branch into main, PR #131 or tutorial PR #127.

- APP UX candidate source: PR #131 (e46a13fa391e8c25eb5c2e1be695f83a133b1346).
- Base: already verified tutorial Auth-Staging QA commit 5e355f17cb77f9b69463c7b7497bbee23ab053c7.
- This branch reuses unmodified tutorial QA sources only to preserve the same signed-in preview environment. Tutorial PR #127 is not changed.
- APP source retains dedicated Auth-Staging URL, origin-only guard and generated-preview CSP.
- Auth-Staging project: ldivswlhtgmznzwhzsoi. Never connect or mutate Production.
- Staging deployment is limited to a new QA preview. Staging project's production branch stays feature/app-v11-hierarchy-archive-20261103.
- No production auth, secrets, RLS, finance data or worker edits.
- Test only synthetic owners. No real passwords or MFA codes in chat.

Staging preview build trigger: 2026-11-04, commit e46a13fa, isolated UX QA only.
