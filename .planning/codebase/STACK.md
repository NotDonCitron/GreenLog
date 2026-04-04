# Technology Stack

**Analysis Date:** 2026-04-03

## Languages

**Primary:**
- TypeScript 5 - All source code (`src/`, API routes, components)
- JavaScript ES2017+ - Target compilation level (tsconfig.json)

**Secondary:**
- CSS - Styling via Tailwind CSS v4 and globals.css

## Runtime

**Environment:**
- Node.js (via Next.js runtime)

**Package Manager:**
- npm 10+ (package-lock.json present)

## Frameworks

**Core:**
- Next.js 16.2.1 - Pages Router with API Routes
- React 19.2.4 - UI library
- React DOM 19.2.4

**Styling:**
- Tailwind CSS v4 - Utility-first CSS (postcss.config.mjs with @tailwindcss/postcss plugin)
- Custom CSS Variables - Theme system via src/app/globals.css

**UI Components:**
- shadcn/ui-style components - Custom components in src/components/ui/
- class-variance-authority 0.7.1 - Component variant styling
- clsx 2.1.1 - Conditional classnames
- tailwind-merge 3.5.0 - Tailwind class merging
- @radix-ui/react-dialog 1.1.15 - Accessible dialog primitive
- lucide-react 0.577.0 - Icon library

**Data Fetching & State:**
- @tanstack/react-query 5.96.0 - Server state management
- React Query Provider wraps application

**Drag and Drop:**
- @dnd-kit/core 6.3.1 - Drag and drop primitives
- @dnd-kit/sortable 10.0.0 - Sortable list primitives
- @dnd-kit/utilities 3.2.2 - DnD utility CSS

**Forms:**
- react-day-picker 9.14.0 - Date picker for forms

**Animations:**
- framer-motion 12.38.0 - Animation library
- tw-animate-css 1.4.0 - Tailwind animation utilities (NOT imported in main branch - causes CSP violations with Turbopack)

**Image Processing:**
- html-to-image 1.11.13 - DOM-to-image conversion
- Tesseract.js 7.0.0 (lazy-loaded) - OCR for strain label scanning

**Push Notifications:**
- web-push 3.6.7 - Web Push protocol implementation

## Backend & Database

**Database:**
- Supabase (PostgreSQL) - Primary database via @supabase/supabase-js 2.99.3
- Row Level Security (RLS) - Data access control at database level
- Supabase Storage - File storage (strain images)

**Authentication:**
- Supabase Auth - User authentication
- JWT-based session handling via cookies

**Supabase Client Usage Pattern:**

| Context | Client | File |
|---------|--------|------|
| Browser/Client Components | Singleton (lazy) | `@/lib/supabase/client` |
| Server Components / API Routes | Per-request | `@/lib/supabase/server` |
| Admin operations (badges, GDPR) | Service role | `@/lib/supabase/client` with `SUPABASE_SERVICE_ROLE_KEY` |

## API Layer

**Framework:**
- Next.js API Routes (Pages Router pattern)
- Route Handlers: `/src/app/api/**/route.ts`

**API Patterns:**
- Standardized responses via `jsonSuccess()` / `jsonError()` helpers (`@/lib/api-response`)
- Bearer token authentication via `authenticateRequest()` helper
- RESTful URL patterns: `/api/[resource]/[id]/[action]/route.ts`

## Error Tracking & Monitoring

**Sentry:**
- @sentry/nextjs 10.46.0 - Error tracking and performance monitoring
- sentry.client.config.ts - Client-side Sentry
- sentry.server.config.ts - Server-side Sentry
- sentry.edge.config.ts - Edge runtime Sentry
- Replay enabled (10% session sample rate)
- Only enabled in production

## Testing

**E2E Testing:**
- Playwright 1.58.2 - E2E test framework
- @playwright/test 1.58.2 - Test runner
- playwright.config.ts - Test configuration
- Tests directory: `tests/` (not co-located)
- Chromium browser project configured

## Deployment

**Platform:**
- Vercel - Hosting and deployment

**Configuration:**
- vercel.json - Build commands
- middleware.ts - Edge middleware (rate limiting)

**Environment Variables:**
- .env.local - Local development secrets
- .env.example - Template with documented variables
- .env.vercel - Vercel deployment secrets

## Build Tools

**Linting:**
- ESLint 9 - Code linting
- eslint-config-next 16.2.1 - Next.js ESLint config
- eslint.config.mjs - ESLint configuration

**Type Checking:**
- TypeScript 5 - Type safety
- tsconfig.json - TypeScript configuration
- @types/node 20, @types/react 19, @types/react-dom 19 - Type definitions

**Development:**
- next dev - Development server
- next build - Production build
- next start - Production server

## Development Dependencies

**CSS:**
- @tailwindcss/postcss 4 - Tailwind CSS v4 PostCSS plugin

**Utilities:**
- dotenv 17.3.1 - Environment variable loading
- @types/web-push 3.6.4 - web-push type definitions

## Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript configuration, path aliases (@/*) |
| `next.config.ts` | Next.js configuration, Sentry integration, image domains |
| `postcss.config.mjs` | PostCSS with Tailwind CSS v4 plugin |
| `eslint.config.mjs` | ESLint configuration |
| `playwright.config.ts` | E2E test configuration |
| `middleware.ts` | Edge middleware with rate limiting |
| `vercel.json` | Vercel build configuration |

## Key Source Directories

| Directory | Purpose |
|----------|---------|
| `src/app/` | Next.js Pages Router (pages + API routes) |
| `src/app/api/` | API route handlers |
| `src/components/` | React components (ui, social, community, strains) |
| `src/lib/` | Utilities, Supabase clients, types, badges |
| `src/hooks/` | Custom React hooks |
| `scripts/` | Data migration, scraping, seeding scripts |
| `supabase-schema.sql` | Complete database schema with RLS policies |
| `supabase/migrations/` | SQL migrations |

---

*Stack analysis: 2026-04-03*
