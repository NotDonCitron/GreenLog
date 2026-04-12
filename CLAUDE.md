# GreenLog – Projekt-Kontext für Claude Code

## Projektübersicht

**GreenLog** ist eine B2B-mandantenfähige Plattform für Clubs und Apotheken zur Verwaltung von Cannabis-Sorten (Strains), Sammlungen und Organizationen (Communities).

- **Primäre Nutzer:** Clubs (CSCs), Apotheken, medizinische Cannabis-Patienten
- **Phase:** MVP abgeschlossen, Phase 2 (Social/Community) aktiv, Grow-Diary (Module A-C) in Implementierung
- **Rechtsstatus:** KCanG (§ 9) — Max 3 aktive Pflanzen pro User. Grow-Diary Feature vollständig legal.

---

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | Next.js 15.5 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, CSS Variables |
| Backend | Next.js Route Handlers (API), React Server Actions |
| Datenbank | Supabase PostgreSQL (mit RLS) |
| Auth | Clerk (JWT/RLS über `requesting_user_id()`) |
| State | TanStack Query (React Query) v5 |
| Deployment | Vercel |
| Mobile | Capacitor (Android) |
| Testing | Vitest (Unit), Playwright (E2E) |
| OCR | Tesseract.js (lazy-loaded) | |

---

## Architektur

```
/src
├── /app                    # Next.js App Router
│   ├── /api                # API Routes (Route Handlers)
│   │   ├── /badges         # Badge Check & Select
│   │   ├── /communities    # Community Management
│   │   ├── /follow-request # Follow Request Handling
│   │   ├── /notifications  # Polling-based Notifications
│   │   ├── /organizations  # Organization CRUD + Members + Invites
│   │   └── /grows          # Grow-Diary API Routes
│   └── /(pages)            # Route Pages
├── /components
│   ├── /ui                 # shadcn/ui Komponenten
│   ├── /social             # Social Features (FollowButton, ActivityFeed, etc.)
│   ├── /community          # Organization/Community Components
│   ├── /strains            # StrainCard, FilterPanel, etc.
│   ├── /notifications      # NotificationBell, NotificationsPanel
│   └── /grows              # Grow-Diary Components (NEW)
└── /lib
    ├── /supabase           # Client (browser), Server, Admin clients
    ├── badges.ts            # Badge Definitions & Criteria
    ├── types.ts             # TypeScript Interfaces (zentral)
    └── strain-display.ts    # Formatting/Display Utilities
```

### Wichtige Dateien

| Pfad | Zweck |
|------|-------|
| `supabase-schema.sql` | Komplettes DB-Schema mit RLS Policies |
| `src/lib/types.ts` | Alle TypeScript Interfaces |
| `src/lib/badges.ts` | Badge-Definitionen + Criteria-Funktionen |
| `src/lib/supabase/client.ts` | Browser Supabase Client |
| `src/lib/supabase/server.ts` | Server-side Supabase Client |
| `src/components/auth-provider.tsx` | Auth Context + Memberships + Demo Mode |

---

## Datenmodell (Supabase)

### Kern-Tabellen

- **profiles** – User-Profile (erweitert Supabase Auth)
- **strains** – Strain-Datenbank (470+ Strains mit Bildern)
- **ratings** – 1-5 Sternen Bewertungen mit Reviews
- **user_strain_relations** – Favorites & Wishlist
- **user_collection** – Private Notes, Batch-Info, persönliche THC/CBD
- **grows / grow_entries** – Grow-Journal (AKTUELL IN IMPLEMENTIERUNG — Module A/B/C)

### Organization-Tabellen

- **organizations** – Clubs/Apotheken
- **organization_members** – Membership mit Rollen (gründer, admin, member, viewer)
- **organization_invites** – Invite-Tokens

### Social-Tabellen

- **follows** – User-Follows
- **follow_requests** – Für private Profile
- **user_activities** – Activity Feed Events

### Security

- RLS (Row Level Security) auf allen Tabellen
- `is_active_org_member()` SECURITY DEFINER Helper für recursion-freie Policy-Checks
- Profiles öffentlich, Organizations öffentlich, Grows optional privat

---

## Wichtige Konventionen

### API Routes

- **Pattern:** `/api/[resource]/[id]/[action]/route.ts`
- **Auth:** Immer `getUser()` vom Supabase Server Client checken
- **Response:** `{ data, error }` Pattern oder `NextResponse.json()`
- **Error Handling:** Konsistentes Format: `{ error: string, code?: string }`

### Supabase Client Nutzung

| Context | Client |
|---------|--------|
| Browser/Client Components | `@/lib/supabase/client` (singleton) |
| Server Components / API Routes | `@/lib/supabase/server` |
| Admin/Badge Jobs (service role) | `@/lib/supabase/server` mit `SUPABASE_SERVICE_ROLE_KEY` |

### Naming Conventions

- **Tabellen:** snake_case (`user_strain_relations`)
- **TypeScript Interfaces:** PascalCase (`UserStrainRelation`)
- **React Components:** PascalCase mit named export (`export const StrainCard`)
- **API Route Files:** route.ts (lowercase)

### Rollen (hardcoded strings)

```
gründer, admin, member, viewer
```

---

## Bekannte Issues & Technical Debt

### Offene Issues

1. ~~Vercel Production Layout kaputt~~ – ✅ VERIFIED: tw-animate wird in main branch NICHT importiert (nur in community-hub worktree). CSP-Problem existiert nur dort.
2. ~~Password Reset Flow~~ – ✅ IMPLEMENTIERT (`/update-password`, `forgot-password-dialog.tsx`)
3. ~~Real-time Notifications~~ – ✅ POLLING implementiert (30-Sekunden-Intervall in `notifications-panel.tsx`)

### Refactoring-Bedarf (Stand April 2026)

| Priorität | Thema | Status |
|-----------|-------|--------|
| P0 | API Error Handling standardisieren | ✅ DONE (jsonSuccess/jsonError helpers) |
| P0 | Composite Index auf `follows(follower_id, following_id)` | ✅ War bereits vorhanden |
| P1 | Badge-Check nur bei relevanten Events | ✅ War bereits korrekt (event-driven, nicht login) |
| P1 | Types ↔ Schema Strains-Konsistenz | ✅ DONE (Migration 20260401080000) |
| P2 | React Query / SWR für Data-Fetching | ✅ DONE (Basis vorhanden — useCollection, follow-button, StrainDetailPageClient; weitere Pages optional) |
| P2 | PWA / App-Store readiness | ✅ DONE (manifest.json, appleWebApp metadata, viewport-fit, ServiceWorker — native App kommt später) |

### Strain Image Admin Override

**Feature:** App developers can replace global strain images when incorrect.

| Aspect | Detail |
|--------|--------|
| Auth | User ID in APP_ADMIN_IDS env variable |
| Endpoint | `PATCH /api/strains/[id]/image` |
| Storage | `strains-images` bucket (public read) |
| Max Size | 5MB |
| MIME Types | image/jpeg, image/png, image/webp, image/gif |

**Files:**
- `supabase/migrations/20260330150000_strain_image_admin.sql` - Storage bucket + RLS
- `src/app/api/strains/[id]/image/route.ts` - PATCH endpoint

**Setup:** Add user IDs to `APP_ADMIN_IDS` env variable (Vercel dashboard or .env.local). Find your User ID in: Supabase Dashboard > Authentication > Users > copy the UUID.

### Legal Documents

> **AGB:** Die AGB (`src/app/(legal)/agb/page.tsx`) haben echten Inhalt, aber minimale Struktur. Für Cannabis-B2B in Deutschland fehlen wichtige Sections (Widerrufsrecht, Zahlungsbedingungen). Vor Production-Launch sollte ein Anwalt die AGB prüfen und vervollständigen.

> **Impressum:** Muss vor Production von Hand ausgefüllt werden (Betreiber-Name, Adresse, § 55 RStV).

---

## Geplante Features (Phase 2)

### 1. Real-Time Collaboration Dashboard (Organizations)

**Bereits implementiert:**
- Activity Feed (`/settings/organization/activities`) mit Events: strain_added/updated/removed, member_joined/removed, role_changed, invite_sent/accepted/revoked
- API: `/api/organizations/[id]/activities` (polling-basiert)

**Noch offen:**
- Supabase Realtime Channel für echte Echtzeit-Updates (WebSocket)
- "Wer ist online" Member-List
- Live-Notification bei neuen Organization-Members

**API Routes (geplant):**
- `/api/organizations/[id]/realtime/connect` – WebSocket upgrade
- `/api/organizations/[id]/presence` – Online Status

### 2. Advanced Analytics Dashboard (Organizations)

**Bereits implementiert:**
- Analytics Page (`/settings/organization/analytics`)
- Top Strains mit Ratings, Favoriten-Zahl, Sorten-Typ
- Activity Heatmap (Tag × Stunde)
- CSV Export

**API Routes (implementiert):**
- `/api/organizations/[id]/analytics/strains` – Strain-Ranking
- `/api/organizations/[id]/analytics/activity` – Activity Heatmap Data
- `/api/organizations/[id]/analytics/export` – CSV Export

---

## Grows Feature – AKTIV (KCanG § 9)

**Grow-Diary Module A/B/C in Implementierung** (April 2026):
- **Module A:** Private Grow-Diary (Plants, Milestones, Daily Logs, DLI-Rechner)
- **Module B:** Public Grow-Community (/grows/explore, Flat Comments)
- **Module C:** Harvest Certificate (next/og server-side)

**KCanG Compliance:** Max 3 aktive Pflanzen pro User (über alle Grows). Hard-Limit per DB-Trigger.

---

## Development

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
npm run dev              # Next.js Dev Server (funktioniert)
supabase db push         # Migrationen zu Supabase
vercel --prod            # Deployment (CSP-Probleme bekannt)
```

### Permissions (settings.local.json)

```
git, npm, supabase, vercel, gh, pnpm
```

<!-- GSD:project-start source:PROJECT.md -->
## Project

**GreenLog**

B2B multi-tenant platform for cannabis clubs (CSCs) and pharmacies to manage strains, collections, and organizations. Users track their favorite strains, rate them, and share within their organization or publicly with followers.

**Validated capabilities (MVP):** Auth, strain database (470+), collections, ratings, social follows/feed, badge system, GDPR compliance, organization management, analytics dashboard.

**Core Value:** Reliable strain data management with fast, consistent UI — mutations (collect, follow, rate) reflect immediately everywhere via centralized cache invalidation.

### Constraints

- **Pages Router**: No Server Components — all data fetching is Client Components
- **Existing hooks**: `useCollection` and `useCollectionIds` must continue working
- **QueryProvider**: Already wraps the app — don't reconfigure the provider itself
- **Demo mode**: Must work without Supabase connection (simulated data)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5 - All source code (`src/`, API routes, components)
- JavaScript ES2017+ - Target compilation level (tsconfig.json)
- CSS - Styling via Tailwind CSS v4 and globals.css
## Runtime
- Node.js (via Next.js runtime)
- npm 10+ (package-lock.json present)
## Frameworks
- Next.js 16.2.1 - Pages Router with API Routes
- React 19.2.4 - UI library
- React DOM 19.2.4
- Tailwind CSS v4 - Utility-first CSS (postcss.config.mjs with @tailwindcss/postcss plugin)
- Custom CSS Variables - Theme system via src/app/globals.css
- shadcn/ui-style components - Custom components in src/components/ui/
- class-variance-authority 0.7.1 - Component variant styling
- clsx 2.1.1 - Conditional classnames
- tailwind-merge 3.5.0 - Tailwind class merging
- @radix-ui/react-dialog 1.1.15 - Accessible dialog primitive
- lucide-react 0.577.0 - Icon library
- @tanstack/react-query 5.96.0 - Server state management
- React Query Provider wraps application
- @dnd-kit/core 6.3.1 - Drag and drop primitives
- @dnd-kit/sortable 10.0.0 - Sortable list primitives
- @dnd-kit/utilities 3.2.2 - DnD utility CSS
- react-day-picker 9.14.0 - Date picker for forms
- framer-motion 12.38.0 - Animation library
- tw-animate-css 1.4.0 - Tailwind animation utilities (NOT imported in main branch - causes CSP violations with Turbopack)
- html-to-image 1.11.13 - DOM-to-image conversion
- Tesseract.js 7.0.0 (lazy-loaded) - OCR for strain label scanning
- web-push 3.6.7 - Web Push protocol implementation
## Backend & Database
- Supabase (PostgreSQL) - Primary database via @supabase/supabase-js 2.99.3
- Row Level Security (RLS) - Data access control at database level
- Supabase Storage - File storage (strain images)
- Supabase Auth - User authentication
- JWT-based session handling via cookies
| Context | Client | File |
|---------|--------|------|
| Browser/Client Components | Singleton (lazy) | `@/lib/supabase/client` |
| Server Components / API Routes | Per-request | `@/lib/supabase/server` |
| Admin operations (badges, GDPR) | Service role | `@/lib/supabase/client` with `SUPABASE_SERVICE_ROLE_KEY` |
## API Layer
- Next.js API Routes (Pages Router pattern)
- Route Handlers: `/src/app/api/**/route.ts`
- Standardized responses via `jsonSuccess()` / `jsonError()` helpers (`@/lib/api-response`)
- Bearer token authentication via `authenticateRequest()` helper
- RESTful URL patterns: `/api/[resource]/[id]/[action]/route.ts`
## Error Tracking & Monitoring
- @sentry/nextjs 10.46.0 - Error tracking and performance monitoring
- sentry.client.config.ts - Client-side Sentry
- sentry.server.config.ts - Server-side Sentry
- sentry.edge.config.ts - Edge runtime Sentry
- Replay enabled (10% session sample rate)
- Only enabled in production
## Testing
- Playwright 1.58.2 - E2E test framework
- @playwright/test 1.58.2 - Test runner
- playwright.config.ts - Test configuration
- Tests directory: `tests/` (not co-located)
- Chromium browser project configured
## Deployment
- Vercel - Hosting and deployment
- vercel.json - Build commands
- middleware.ts - Edge middleware (rate limiting)
- .env.local - Local development secrets
- .env.example - Template with documented variables
- .env.vercel - Vercel deployment secrets
## Build Tools
- ESLint 9 - Code linting
- eslint-config-next 16.2.1 - Next.js ESLint config
- eslint.config.mjs - ESLint configuration
- TypeScript 5 - Type safety
- tsconfig.json - TypeScript configuration
- @types/node 20, @types/react 19, @types/react-dom 19 - Type definitions
- next dev - Development server
- next build - Production build
- next start - Production server
## Development Dependencies
- @tailwindcss/postcss 4 - Tailwind CSS v4 PostCSS plugin
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
### Files
| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase, named export | `StrainCard.tsx`, `FollowButton.tsx` |
| API Route Files | lowercase | `route.ts`, `route.tsx` |
| TypeScript Interfaces | PascalCase | `Strain`, `OrganizationMembership`, `UserActivity` |
| Type Files | PascalCase | `types.ts`, `badges.ts` |
| Hooks | camelCase, `use` prefix | `useCollection.ts`, `useCollectionIds.ts` |
| Utility Files | camelCase or kebab-case | `strain-display.ts`, `collection-events.ts` |
| Database Tables | snake_case | `user_strain_relations`, `organization_members` |
| Environment Variables | SCREAMING_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL`, `APP_ADMIN_IDS` |
### Directories
| Directory | Purpose |
|-----------|---------|
| `src/app/` | Next.js Pages Router pages and API routes |
| `src/app/api/` | API route handlers |
| `src/components/` | React components (organized by feature) |
| `src/components/ui/` | shadcn/ui base components |
| `src/components/social/` | Social feature components (FollowButton, ActivityFeed) |
| `src/components/strains/` | Strain-related components |
| `src/components/community/` | Organization/community components |
| `src/lib/` | Shared utilities, Supabase clients, types |
| `src/hooks/` | Custom React hooks |
### Functions and Variables
| Type | Convention | Example |
|------|------------|---------|
| Functions | camelCase | `fetchFullCollection`, `checkAndUnlockBadges` |
| Variables | camelCase | `userId`, `organizationId`, `strainError` |
| React Components | PascalCase | `AuthProvider`, `StrainCard` |
| Constants | PascalCase or SCREAMING_SNAKE_CASE | `ALL_BADGES`, `ACTIVE_ORG_STORAGE_KEY` |
| Type Guards | PascalCase | `BadgeDefinition`, `BadgeCriteria` |
| CSS Classes | kebab-case | `premium-card`, `title-font` |
### Database Schema Conventions
- Tables use `snake_case` (e.g., `user_strain_relations`)
- Columns use `snake_case` (e.g., `membership_status`, `organization_type`)
- Roles are hardcoded strings: `gründer`, `admin`, `member`, `viewer`
- UUID primary keys default to `gen_random_uuid()`
- Timestamps use `timestamptz` with `now()` default
- RLS policies use descriptive names with spaces
## Code Style
### Formatting
- **Tool:** ESLint (eslint-config-next/core-web-vitals) + TypeScript support
- **Configuration:** `eslint.config.mjs` at project root
- **Run command:** `npm run lint`
### Key ESLint Settings
### Path Aliases
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
### TypeScript Settings
## Import Organization
### Import Order (recommended)
### Example
## API Route Patterns
### Standard API Route Structure
### API Response Helpers
| Helper | Purpose |
|--------|---------|
| `jsonSuccess<T>(data, status)` | Returns `{ data, error: null }` with status code |
| `jsonError(message, status, code?, details?)` | Returns `{ data: null, error: { message, code, details } }` |
| `authenticateRequest(request, getClient)` | Validates Bearer token, returns user + supabase client |
### Dynamic Route Parameters
### Route File Naming
| Pattern | File |
|---------|------|
| Single resource | `/api/strains/route.ts` |
| Resource with ID | `/api/organizations/[organizationId]/route.ts` |
| Nested action | `/api/strains/[id]/image/route.ts` |
## Component Patterns
### Functional Components with Memo
### Client Components
### Context Providers
## Error Handling
### API Errors
- Always return structured errors via `jsonError()`
- Include error code and details when available from Supabase
- Log errors server-side with `console.error()`
### Client-Side Errors
- Use try/catch for async operations
- React Query handles errors via `onError` callbacks
- Graceful degradation with fallback values
### Supabase Error Handling
## Logging
### Server-Side (API Routes)
### Client-Side (React Components)
## React Query Usage
### Query Structure
### Mutation Structure
## Supabase Client Patterns
| Context | Client | File |
|---------|--------|------|
| Browser/Client | Singleton via Proxy | `@/lib/supabase/client` |
| Server Components | Per-request | `@/lib/supabase/server` |
| Admin operations | Service role | `@/lib/supabase/client` with `SUPABASE_SERVICE_ROLE_KEY` |
### Browser Client (Lazy Singleton)
### Authenticated Client for API Routes
## TypeScript Patterns
### Interface Definitions
### Type Exports from Interfaces
## CSS and Styling
### Tailwind CSS v4
- Uses `@tailwindcss/postcss` for Tailwind v4 integration
- Custom CSS variables defined in `globals.css`
- Component classes use shadcn/ui patterns
### CSS Class Patterns
| Pattern | Usage |
|---------|-------|
| Layout | `flex`, `grid`, `w-full`, `h-full` |
| Spacing | `px-4`, `py-2`, `gap-2`, `space-y-4` |
| Typography | `text-sm`, `font-bold`, `uppercase` |
| Colors | `bg-[#121212]`, `text-white`, `border-white/10` |
| Effects | `rounded-[20px]`, `shadow-lg`, `backdrop-blur-md` |
| Animation | `transition-all`, `duration-300`, `hover:scale-[1.03]` |
## File Organization Guidelines
### Where to Add New Code
| Type | Location |
|------|----------|
| New API route | `src/app/api/[resource]/route.ts` |
| New page | `src/app/[route]/page.tsx` |
| New component | `src/components/[feature]/[ComponentName].tsx` |
| New hook | `src/hooks/use[Name].ts` |
| New type | `src/lib/types.ts` |
| New utility | `src/lib/[utility-name].ts` |
| New test | `tests/[name].spec.ts` |
### Barrel Files (index.ts)
| File | Exports |
|------|---------|
| `src/lib/display/index.ts` | Re-exports from `./display/*` |
| `src/components/providers/index.tsx` | Provider components |
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Server-side rendering via Next.js Pages Router
- Supabase manages Auth, Database (PostgreSQL), Storage, and RLS
- Client-side state via React Context + React Query
- API routes handle server-side logic and Supabase Admin operations
## Layers
### Presentation Layer (Next.js Pages)
- **Purpose:** Render UI and handle client-side interactions
- **Location:** `src/app/` (pages), `src/components/`
- **Contains:** React components, pages, layouts
- **Depends on:** Supabase client for data, React Context for auth state
- **Used by:** Browser
### API Layer (Next.js Route Handlers)
- **Purpose:** Server-side endpoints for complex operations, Supabase Admin actions, GDPR
- **Location:** `src/app/api/`
- **Contains:** Route handlers following pattern `/api/[resource]/[id]/[action]/route.ts`
- **Depends on:** Supabase server client, auth helpers
- **Used by:** Client components via fetch
### Data Access Layer (Supabase Client Libraries)
- **Purpose:** Type-safe database operations with RLS
- **Location:** `src/lib/supabase/`
- **Contains:**
### State Management
- Context: `AuthProvider` (`src/components/auth-provider.tsx`)
- Provides: `user`, `session`, `memberships`, `activeOrganization`
- Demo mode: Simulated data without Supabase connection
- Provider: `QueryProvider` (`src/components/providers/query-provider.tsx`)
- Configuration: 60s stale time, 5min gcTime, retry once
- Key hooks: `useCollection` (`src/hooks/useCollection.ts`)
- React `useState` for local UI state
- `useCallback` for memoized callbacks passed to children
## Data Flow
### Authentication Flow:
### API Request Flow (e.g., POST /api/strains):
### Collection Mutation Flow:
## Key Abstractions
### Supabase Client Pattern
```typescript
```
- Lazy initialization prevents "window is not defined" during SSR
- Proxy allows direct import without triggering client creation
```typescript
```
```typescript
```
### API Response Helpers
```typescript
```
### Organization Membership Helper
```sql
```
- Uses `SECURITY DEFINER` to bypass RLS when checking membership
- Prevents infinite recursion in RLS policies
### Collection Hook Pattern
```typescript
```
## Entry Points
### Root Layout (`src/app/layout.tsx`):
- Sets up fonts (Space Grotesk, Inter)
- Wraps app with `Providers` (QueryProvider + AuthProvider)
- Initializes theme via `ThemeInit`
- Registers service worker
- Renders `OnboardingGuide` and `CookieConsentBanner`
### Auth Provider (`src/components/auth-provider.tsx`):
- Manages user session, memberships, active organization
- Handles demo mode toggle
- Fetches memberships on user change
- Syncs active org to localStorage
### Query Provider (`src/components/providers/query-provider.tsx`):
- React Query `QueryClient` with sensible defaults
- 60s stale time, single retry, refetch on window focus
## Error Handling
- Use `jsonError(message, status, code, details)` for consistent error format
- `authenticateRequest()` helper returns 401 for missing/invalid auth
- React Query error boundaries
- Try/catch around async operations
- Demo mode fallback when Supabase unavailable
- RLS policies enforce access control
- `is_active_org_member()` helper prevents RLS recursion
## Cross-Cutting Concerns
- Supabase Auth with email/password
- Session stored in HTTP-only cookies (server) + localStorage (client)
- Demo mode bypasses auth for testing
- RLS on all Supabase tables
- Role-based: `gründer`, `admin`, `member`, `viewer`
- Organization-scoped data via `organization_id`
- `console.error` for API errors with stack traces
- Debug logging in development (e.g., activity write debug)
- Schema validation in API handlers before database operations
- TypeScript interfaces in `src/lib/types.ts` ensure type safety
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
