# Architecture

**Analysis Date:** 2026-04-03

## Pattern Overview

**Overall:** Next.js 16 (Pages Router) with Supabase as Backend-as-a-Service

**Key Characteristics:**
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
  - `client.ts` - Browser singleton client (lazy-initialized proxy)
  - `server.ts` - Per-request server client with cookie-based auth
  - Admin operations via service role key

### State Management

**Auth State:**
- Context: `AuthProvider` (`src/components/auth-provider.tsx`)
- Provides: `user`, `session`, `memberships`, `activeOrganization`
- Demo mode: Simulated data without Supabase connection

**Server State (React Query):**
- Provider: `QueryProvider` (`src/components/providers/query-provider.tsx`)
- Configuration: 60s stale time, 5min gcTime, retry once
- Key hooks: `useCollection` (`src/hooks/useCollection.ts`)

**Component State:**
- React `useState` for local UI state
- `useCallback` for memoized callbacks passed to children

## Data Flow

### Authentication Flow:

1. User navigates to `/login`
2. Supabase Auth via email/password or OAuth
3. Session stored in cookies (`sb-access-token`, `sb-refresh-token`)
4. `AuthProvider` fetches session via `supabase.auth.getSession()`
5. Memberships loaded from `organization_members` table
6. Active organization persisted to `localStorage`

### API Request Flow (e.g., POST /api/strains):

1. Client component calls `fetch('/api/strains', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } })`
2. Route handler calls `authenticateRequest()` from `src/lib/api-response.ts`
3. `authenticateRequest` validates token and returns user + supabase client
4. Handler performs database operation
5. Response: `jsonSuccess(data)` or `jsonError(message, status)`

### Collection Mutation Flow:

1. User clicks "Collect" on a strain
2. `useCollection().collect(strainId, opts)` called
3. React Query `useMutation` fires
4. Optimistic update: immediately add ID to `collection-ids` query cache
5. On error: rollback to previous cache
6. On settled: invalidate queries, emit collection update event, check badges

## Key Abstractions

### Supabase Client Pattern

**Browser Client (Singleton):**
```typescript
// src/lib/supabase/client.ts
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getClient()[prop as keyof SupabaseClient];
  },
});
```
- Lazy initialization prevents "window is not defined" during SSR
- Proxy allows direct import without triggering client creation

**Server Client (Per-Request):**
```typescript
// src/lib/supabase/server.ts
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;
  return createClient(url, key, { /* cookie-based auth */ });
}
```

**Authenticated Client (API Routes):**
```typescript
// src/lib/supabase/client.ts
export async function getAuthenticatedClient(accessToken: string): Promise<SupabaseClient> {
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  await client.auth.setSession({ access_token: accessToken, refresh_token: "" });
  return client;
}
```

### API Response Helpers

**Pattern from `src/lib/api-response.ts`:**
```typescript
// Success
return jsonSuccess({ strain }, 201);

// Error
return jsonError("Failed to create strain", 500, error.code, error.message);
```

### Organization Membership Helper

**RLS-Recursion-Free Check (`is_active_org_member`):**
```sql
-- supabase-schema.sql
CREATE OR REPLACE FUNCTION is_active_org_member(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id AND organization_id = p_org_id AND membership_status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```
- Uses `SECURITY DEFINER` to bypass RLS when checking membership
- Prevents infinite recursion in RLS policies

### Collection Hook Pattern

**Centralized collection state (`src/hooks/useCollection.ts`):**
```typescript
export function useCollection() {
  // Full collection with strain data
  const collectionQuery = useQuery({
    queryKey: ["collection", user?.id],
    queryFn: () => fetchFullCollection(user!.id),
    enabled: !!user,
  });

  // Lightweight ID-only query for isCollected checks
  const idsQuery = useQuery({
    queryKey: ["collection-ids", user?.id],
    queryFn: () => fetchCollectionIds(user!.id),
    enabled: !!user,
  });

  // Mutations with optimistic updates
  const collectMutation = useMutation({
    mutationFn: async ({ strainId, opts }) => { /* ... */ },
    onMutate: async ({ strainId }) => { /* optimistic update */ },
    onError: (err, vars, context) => { /* rollback */ },
    onSettled: () => { /* invalidate + badge check */ },
  });
}
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

**API Routes:**
- Use `jsonError(message, status, code, details)` for consistent error format
- `authenticateRequest()` helper returns 401 for missing/invalid auth

**Client Components:**
- React Query error boundaries
- Try/catch around async operations
- Demo mode fallback when Supabase unavailable

**Database:**
- RLS policies enforce access control
- `is_active_org_member()` helper prevents RLS recursion

## Cross-Cutting Concerns

**Authentication:**
- Supabase Auth with email/password
- Session stored in HTTP-only cookies (server) + localStorage (client)
- Demo mode bypasses auth for testing

**Authorization:**
- RLS on all Supabase tables
- Role-based: `gründer`, `admin`, `member`, `viewer`
- Organization-scoped data via `organization_id`

**Logging:**
- `console.error` for API errors with stack traces
- Debug logging in development (e.g., activity write debug)

**Validation:**
- Schema validation in API handlers before database operations
- TypeScript interfaces in `src/lib/types.ts` ensure type safety

---

*Architecture analysis: 2026-04-03*
