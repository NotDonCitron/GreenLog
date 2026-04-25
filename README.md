# GreenLog / CannaLog

GreenLog, also referred to as CannaLog in parts of the product copy, is an 18+ PWA for cannabis strain tracking, grow diary workflows, community and organization features, and compliance-adjacent documentation. The app does not sell, broker, deliver, or facilitate cannabis transactions.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Supabase Auth, Postgres, RLS, and Storage/edge infrastructure
- Tailwind CSS 4
- Capacitor for the later Android packaging path
- Vitest and Playwright

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with project-specific values. Never commit real secrets.

Required for normal app runtime:

- `NEXT_PUBLIC_SUPABASE_URL` - public Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - public browser anon key.
- `SUPABASE_SERVICE_ROLE_KEY` - server-only Supabase service role key for trusted API routes.
- `APP_ADMIN_IDS` - comma-separated Supabase user IDs that should pass server-side admin checks.
- `NEXT_PUBLIC_SITE_URL` - canonical public site URL used by links, metadata, and notification flows.

Required when the related feature is enabled:

- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` for push notifications.
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_REGION`, `MINIO_FORCE_PATH_STYLE`, `MINIO_PUBLIC_MODE`, and `IMAGE_PUBLIC_BASE_PATH` for GreenLog-owned media storage.
- `SENTRY_*` and `NEXT_PUBLIC_SENTRY_DSN` for Sentry.
- `TURNSTILE_TEST_KEY` and `TURNSTILE_TEST_SECRET` for local E2E bypass keys.
- `MINIMAX_API_KEY` for optional AI-assisted feedback refinement.

## Development

```bash
npm run dev
```

The local app runs on `http://localhost:3000` by default.

## Tests

```bash
npm run lint
npm run test
npm run test:e2e
```

Playwright is configured to start the dev server automatically when no local server is already running.

## Build

```bash
npm run build
npm run start
```

`npm run build` produces the Next.js production build. `npm run start` serves the generated build locally for smoke testing.

## Deployment

The launch path is PWA on Vercel first. Android packaging through Capacitor comes later, after the PWA beta is stable, policy copy is final, and Play Store assets/review requirements are prepared.

Before public launch, verify:

- Vercel deployment is green.
- Supabase migrations are applied to the target project.
- Required legal pages are reachable.
- No `.env.local`, service keys, logs, or virtual environments are committed.

## Legal Notice

GreenLog/CannaLog is only for adult users. The product does not sell cannabis, arrange sales, broker purchases, provide delivery, or connect buyers and sellers. Users are responsible for following applicable local laws and regulations.
