# Codebase Structure

**Analysis Date:** 2026-04-03

## Directory Layout

```
GreenLog/
├── src/
│   ├── app/                    # Next.js Pages Router + API Routes
│   │   ├── api/                # Route handlers
│   │   ├── (legal)/            # Legal pages (AGB, Datenschutz, Impressum)
│   │   └── [routes]/           # Page routes (strains, collection, profile, etc.)
│   ├── components/
│   │   ├── providers/          # React Query + Auth providers
│   │   ├── ui/                 # shadcn/ui base components
│   │   ├── social/             # Social features (follow, activity feed)
│   │   ├── community/          # Organization/community components
│   │   ├── strains/             # Strain-related components
│   │   ├── notifications/      # Notification components
│   │   └── [other]/             # Auth, home, onboarding, etc.
│   ├── hooks/                   # Custom React hooks
│   └── lib/                     # Shared utilities and Supabase clients
├── supabase/
│   └── migrations/             # SQL migrations
├── scripts/                     # Utility scripts (scraping, data cleaning)
├── docs/                        # Documentation, plans, specs
└── public/                      # Static assets
```

## Directory Purposes

### `src/app/`

**Purpose:** Next.js Pages Router - all routes and API endpoints

**Key Routes:**
- `/` (`page.tsx`) - Home page with strain of the day
- `/login` - Authentication
- `/strains` - Strain listing with filters
- `/strains/[slug]` - Individual strain detail
- `/strains/compare` - Side-by-side strain comparison
- `/collection` - User's personal collection
- `/feed` - Social activity feed
- `/discover` - Discover users and communities
- `/community/[id]` - Community/organization page
- `/profile` - User profile
- `/profile/settings` - Settings pages
- `/settings/organization/*` - Organization management
- `/scanner` - OCR strain scanner

**Legal Routes (src/app/(legal)/):**
- `/agb` - Terms and conditions
- `/datenschutz` - Privacy policy
- `/impressum` - Legal notice

### `src/app/api/`

**Purpose:** Server-side API route handlers

**Key API Routes:**
- `/api/strains` - Strain CRUD operations
- `/api/strains/[id]/image` - Strain image upload (admin)
- `/api/organizations` - Organization CRUD
- `/api/organizations/[id]/members` - Member management
- `/api/organizations/[id]/invites` - Invite management
- `/api/organizations/[id]/activities` - Organization activity feed
- `/api/organizations/[id]/analytics/*` - Analytics endpoints
- `/api/badges/check` - Badge eligibility check
- `/api/badges/select` - Badge selection
- `/api/follow-request/*` - Follow request management
- `/api/notifications` - Notification polling
- `/api/gdpr/*` - GDPR endpoints (export, delete, consent)
- `/api/filter-presets` - Filter preset management
- `/api/invites/*` - Invite acceptance flow
- `/api/push/*` - Push notification subscription

### `src/components/`

**Purpose:** React components organized by feature area

**Subdirectories:**

| Directory | Purpose |
|-----------|---------|
| `ui/` | shadcn/ui base components (button, card, dialog, input, badge, etc.) |
| `social/` | Social features: `FollowButton`, `ActivityFeed`, `FollowRequestsModal`, `UserCard`, `SuggestedUsers`, `StatsBar` |
| `community/` | Organization components: `OrgLogoUpload`, `FollowButton`, `AdminListModal` |
| `strains/` | Strain features: `StrainCard`, `FilterPanel`, `CreateStrainModal`, `ActiveFilterBadges`, `RangeSlider` |
| `notifications/` | `NotificationBell`, notification panel |
| `providers/` | React providers: `QueryProvider` (React Query), `Providers` (combined) |
| `auth/` | Auth components: `ForgotPasswordDialog` |
| `home/` | Home page components: `CollectionStack`, `EmptyState` |
| `onboarding/` | Onboarding flow: `OnboardingGuide` |
| `profile/` | Profile components: `UserCollectionsTab`, `BadgeShowcase` |
| `feedback/` | Feedback components: `FeedbackButton`, `FeedbackModal` |

**Top-level components:**
- `auth-provider.tsx` - Auth context provider with membership management
- `bottom-nav.tsx` - Mobile navigation bar
- `organization-switcher.tsx` - Organization selection dropdown
- `age-gate.tsx` - Age verification gate
- `cookie-consent-banner.tsx` - GDPR cookie consent
- `theme-switcher.tsx` / `theme-toggle.tsx` - Theme switching
- `theme-init.tsx` - Theme initialization (client-only)

### `src/lib/`

**Purpose:** Shared utilities, Supabase clients, type definitions, business logic

**Files:**

| File | Purpose |
|------|---------|
| `supabase/client.ts` | Browser Supabase client (lazy singleton proxy) |
| `supabase/server.ts` | Server-side Supabase client (cookie-based auth) |
| `types.ts` | TypeScript interfaces for all data models |
| `badges.ts` | Badge definitions (26 badges) and criteria functions |
| `api-response.ts` | `jsonSuccess`, `jsonError`, `authenticateRequest` helpers |
| `collection-events.ts` | Event bus for collection updates (deprecated - use hooks) |
| `organization-activities.ts` | Activity logging helper for organizations |
| `push.ts` | Push notification subscription helpers |
| `constants.ts` | App constants (demo data, etc.) |
| `strain-display.ts` | Display formatting utilities for strains |
| `utils.ts` | General utilities |

### `src/hooks/`

**Purpose:** Custom React hooks for shared stateful logic

**Files:**

| File | Purpose |
|------|---------|
| `useCollection.ts` | Collection state, mutations, optimistic updates |
| `useCollectionIds.ts` | Lightweight hook for collection ID-only queries |
| `usePushSubscription.ts` | Push notification subscription management |

### `supabase/`

**Purpose:** Database schema and migrations

**Files:**
- `supabase-schema.sql` - Complete database schema with RLS policies, indexes, triggers
- `supabase/migrations/` - Time-stamped SQL migration files

### `scripts/`

**Purpose:** Utility scripts for data management

**Key scripts:**
- `clean-strain-names.mjs` - Remove "Farmer" prefixes from strain names
- `lib/` - Script helper libraries

### `public/`

**Purpose:** Static assets served directly

**Contents:**
- `strains/` - Strain images (uploaded to Supabase Storage, cached here)
- `apple-touch-icon.png` - iOS app icon
- `manifest.json` - PWA manifest

## Key File Locations

### Entry Points

| Path | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with providers |
| `src/components/providers/index.tsx` | Combined providers wrapper |

### Supabase Configuration

| Path | Purpose |
|------|---------|
| `src/lib/supabase/client.ts` | Browser client (use in client components) |
| `src/lib/supabase/server.ts` | Server client (use in API routes, Server Components) |
| `supabase-schema.sql` | Database schema with RLS policies |

### Type Definitions

| Path | Purpose |
|------|---------|
| `src/lib/types.ts` | All TypeScript interfaces |
| `src/lib/badges.ts` | Badge definitions + criteria |

### State Management

| Path | Purpose |
|------|---------|
| `src/components/auth-provider.tsx` | Auth context (user, session, memberships) |
| `src/components/providers/query-provider.tsx` | React Query configuration |
| `src/hooks/useCollection.ts` | Collection state hook |

### API Response Helpers

| Path | Purpose |
|------|---------|
| `src/lib/api-response.ts` | `jsonSuccess`, `jsonError`, `authenticateRequest` |

## Naming Conventions

**Files:**
- React components: PascalCase with named export (`StrainCard.tsx`)
- API routes: lowercase with route suffix (`route.ts`)
- Utilities: camelCase or kebab-case
- TypeScript types: PascalCase (`Strain`, `OrganizationMembership`)

**Directories:**
- Feature directories: lowercase (`social/`, `strains/`)
- Page directories: lowercase with route convention (`(legal)/`, `settings/`)

**Database:**
- Tables: snake_case (`user_strain_relations`, `organization_members`)
- Columns: snake_case (`organization_id`, `membership_status`)

**API Routes Pattern:**
```
/api/[resource]/[id]/[action]/route.ts
```
Examples:
- `/api/strains/route.ts` - List/create strains
- `/api/strains/[id]/route.ts` - Get/update/delete strain
- `/api/strains/[id]/image/route.ts` - Upload strain image
- `/api/organizations/[id]/members/route.ts` - Organization members

## Where to Add New Code

### New Feature/Page

1. Create page file: `src/app/[feature]/page.tsx`
2. Create components: `src/components/[feature]/`
3. Add API routes: `src/app/api/[feature]/`
4. Add types if needed: `src/lib/types.ts`

### New API Endpoint

1. Create route file: `src/app/api/[resource]/[action]/route.ts`
2. Use `authenticateRequest` for protected endpoints
3. Return `jsonSuccess(data)` or `jsonError(message, status)`

### New React Component

1. Determine feature area (social, strains, community, etc.)
2. Create file in appropriate `src/components/[feature]/` directory
3. Use named export: `export const MyComponent`
4. Import types from `src/lib/types.ts`

### New Collection Mutation

1. Add mutation to `src/hooks/useCollection.ts`
2. Use `useMutation` with optimistic update pattern
3. Call `emitCollectionUpdate()` on settled
4. Call `checkAndUnlockBadges()` if badge-relevant

### New Badge

1. Add definition to `ALL_BADGES` in `src/lib/badges.ts`
2. Add criteria function to `BADGE_CRITERIA` object
3. Criteria receives `{ supabase, userId }` and returns `Promise<boolean>`

## Special Directories

### `src/app/(legal)/`

- **Purpose:** Route group for legal pages (no layout changes)
- **Generated:** No
- **Contains:** AGB, Datenschutz, Impressum, English variants

### `src/app/api/gdpr/`

- **Purpose:** GDPR compliance endpoints
- **Contains:** `export` (data export), `delete` (account deletion), `consent` (consent management)

### `src/components/providers/`

- **Purpose:** React context and query providers
- **Contains:** `QueryProvider`, `Providers` wrapper
- **Note:** QueryProvider wraps AuthProvider in Providers

### `supabase/migrations/`

- **Purpose:** Time-stamped SQL migrations
- **Naming:** `YYYYMMDDHHMMSS_description.sql`
- **Examples:** `20260330150000_strain_image_admin.sql`, `20260401080000_thc_cbd_consistency.sql`

---

*Structure analysis: 2026-04-03*
