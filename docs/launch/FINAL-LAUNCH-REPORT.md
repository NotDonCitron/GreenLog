# Final Launch Report

Date: 2026-04-25

## What Was Fixed

- Replaced the incorrect root README with a GreenLog/CannaLog README covering setup, env vars, tests, build, deployment, and legal positioning.
- Removed committed dev artifacts from Git tracking, including logs, smoke artifacts, and `tools/voice-stt/.venv/`.
- Expanded `.gitignore` for logs, virtual environments, smoke artifacts, and temporary scraper/import files.
- Removed product-code reliance on `NEXT_PUBLIC_APP_ADMIN_IDS`; server admin checks now use `APP_ADMIN_IDS` only.
- Added `/api/admin/me` and `useAppAdmin()` so client UI receives only an admin boolean.
- Updated admin/profile/strain UI surfaces to use the secure admin-check path.
- Removed stale Clerk config from app config and verified product code no longer imports Clerk.
- Hardened RLS migrations for notifications, community feed inserts, organization member mutation, and organization invite mutation.
- Added Playwright `webServer` config and a GitHub Actions CI workflow for lint, tests, and build.
- Fixed failing tests around canonical strain transform, publish gate validation, source policy copy, public media URLs, and sign-in fallback behavior.
- Updated launch/security/release docs to match the current Next.js 15 PWA-first path.

## Validation

- `npm install`: passed.
- `npm run lint`: passed with 0 errors and 139 existing warnings.
- `npm run test`: passed, 46 files and 187 tests.
- `npm run build`: passed with Next.js 15.5.15, 104/104 static pages generated. Sandbox-only build failed because Turbopack could not spawn/bind worker processes; normal OS execution passed.
- Local production smoke: passed on `http://localhost:3010` for `/`, `/strains`, `/strains/blue-dream`, `/profile`, `/grows`, `/community`, `/login`, `/age-gate`, `/impressum`, `/datenschutz`, `/agb`, `/sw.js`, and `/manifest.json`.
- Age gate: unauthenticated/no-cookie route requests redirect to `/age-gate?next=...`; with `greenlog_age_verified=true`, launch routes returned 200.
- Offline/PWA behavior: `sw.js` and `manifest.json` returned 200; `sw.js` is served with no-store/no-cache headers.

## Remaining Risks

- Supabase migrations must be applied and live RLS policies must be inspected in the target project.
- Historical migrations still contain older `auth.uid()` and broad storage policy definitions; final live policy state matters more than the raw migration history.
- Image uploads still need shared magic-byte validation.
- `grow_milestones`, `feedback_tickets`, strain THC/CBD validation, and broader POST body length validation remain open High findings.
- Vercel production deployment, HTTPS, legal pages, cookie consent, and age gate need final production smoke checks.

## PWA Beta Readiness

Code is build-ready for a PWA beta branch. It is not fully production launch-ready until Vercel deployment, live HTTPS route smoke tests, and Supabase migration verification are complete.

## Before Android / Play Store

- Stabilize the PWA beta first.
- Finalize Play Store policy copy, screenshots, support/privacy URLs, and age rating.
- Configure Capacitor signing and native build pipeline.
- Confirm the app store listing does not imply cannabis sales, brokerage, ordering, or delivery.
