# MMHVAULT Landing L1.5 — isolated cinematic preview rollout

Date: 2026-11-01 (Thailand local).

## Preview
Target: https://mmhvault-landing-l1-preview.pages.dev/
Branch: feature/landing-page.
No changes to main, mmhvault.com, auth routes, Supabase, PWA manifest or service workers.

## New media
- landing-assets/cinematic-lake.webp — original, compressed landscape background.
- landing-assets/personal-business-concept.webp — original Personal/Business finance concept artwork.
These are illustration assets, **not screenshots from any live financial account**.

## Presentation
- Existing permanent trilingual Hero text remains unchanged by language switching.
- Cinematic imagery loads progressively, falls back to previous HTML device preview if image cannot be decoded.
- New #business section includes a clickable Personal/Business mock workspace.
- Business is expressly marked Coming Soon / Concept, not advertised as a production feature.
- Financial amounts in every demonstration are fictional.

## Deployment checks
Cloudflare Pages build must include the two WebP files, business.css and cinematic.css.
Redirect preview login/privacy/terms/security to https://mmhvault.com/ and keep robots noindex.

## Release gate
Do not merge or deploy to main without separate explicit approval. Re-read latest main and N10 login/PWA changes before any future production integration.
