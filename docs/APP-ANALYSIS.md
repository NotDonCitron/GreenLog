# GreenLog App Analysis

Status: launch-readiness snapshot from 2026-04-25. Older notes in this file mentioned Next.js 16 and several missing MVP features that no longer match the repository.

## Overview

GreenLog/CannaLog is a Next.js 15 PWA for adult cannabis strain tracking, grow diary workflows, private consumption logging, community/organization surfaces, and compliance-adjacent documentation.

## Current Stack

- Next.js 15.5.x App Router
- React 19
- TypeScript
- Supabase Auth, Postgres, RLS, and server-side service-role API paths
- Tailwind CSS 4
- Capacitor scaffolding for later Android packaging
- Vitest unit/component tests
- Playwright E2E tests

## Implemented Product Areas

| Area | Current status |
| --- | --- |
| Public PWA shell | Implemented with manifest and service worker |
| Age gate | Implemented, must be smoke-tested on production |
| Supabase Auth | Active auth path; Clerk is not used by product code |
| Strain catalog | Published strain list/detail pages with image quality gates |
| Private collection and quick log | Implemented through user-scoped data |
| Grow diary | Implemented with grow timelines, entries, media, and owner controls |
| Community and organizations | Implemented with membership/invite surfaces and feed/activity features |
| Profile privacy | Implemented with public-profile visibility flags |
| Admin review surfaces | Implemented behind server-side admin checks |
| Push notifications | Implemented, requires valid VAPID environment before launch |

## Launch-Relevant Findings

- Build stability has been restored for the current code path; the production build succeeds when run outside the restricted sandbox.
- Client-side admin ID exposure has been removed from app code. Admin checks now use `APP_ADMIN_IDS` server-side, and client UI consumes `/api/admin/me` for a boolean result.
- Clerk dependencies/imports are not used in product code. Remaining Clerk mentions are historical docs/log context or defensive service-worker bypass text.
- Supabase RLS has a new launch hardening migration for notifications, community feed writes, organization member mutation, and invite mutation.
- Several storage/API validation risks remain open and are documented in `docs/audits/LAUNCH-SECURITY-STATUS.md`.

## Launch Risks To Track

- Apply and verify Supabase migrations in the real target project before public beta.
- Re-check live RLS policy state after migration, because historical migrations still contain older `auth.uid()` and broad storage policy definitions.
- Add magic-byte image validation before accepting broad public uploads at scale.
- Finish Vercel production smoke checks after deployment.
- Keep Android/Play Store work behind the PWA launch until policy, screenshots, store listing, and native build workflow are ready.
