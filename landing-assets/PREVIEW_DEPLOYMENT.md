# L1.0 independent online preview
Deployment: dedicated Cloudflare Pages project `mmhvault-landing-l1-preview`.
Branch: `feature/landing-page` only. No main deployment.
Preview URL after Pages build succeeds: https://mmhvault-landing-l1-preview.pages.dev/
Build output includes only `landing-preview.html` as `index.html`, its own CSS/JS, and the existing brand logo and icon.
Preview login/privacy/security/terms paths redirect to live mmhvault.com to avoid handling credentials on the temporary preview domain.
The preview has `noindex` HTML meta and `X-Robots-Tag: noindex` header.
This commit triggers the isolated preview project build after its creation. Do not merge the PR without the owner's separate approval.
