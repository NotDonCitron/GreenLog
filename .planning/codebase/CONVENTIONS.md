# Coding Conventions

**Analysis Date:** 2026-04-03

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

```javascript
// eslint.config.mjs
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
```

### Path Aliases

- `@/*` maps to `./src/*` (configured in `tsconfig.json`)

### TypeScript Settings

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## Import Organization

### Import Order (recommended)

1. React/Next.js imports (`react`, `next/link`, `next/image`)
2. Third-party libraries (`@supabase/supabase-js`, `@tanstack/react-query`)
3. Internal imports (`@/lib/*`, `@/components/*`)
4. Relative imports (`./utils`, `../components/*`)
5. Type imports (separate line with `import type`)

### Example

```typescript
import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

import type { Strain, StrainSource } from "@/lib/types";
```

## API Route Patterns

### Standard API Route Structure

```typescript
// src/app/api/[resource]/route.ts or /[id]/[action]/route.ts
import { NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

export async function GET(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return;
    const { user, supabase } = auth;

    // Business logic...

    return jsonSuccess({ data });
}

export async function POST(request: Request, { params }: RouteParams) {
    const auth = await authenticateRequest(request, getAuthenticatedClient);
    if (!auth) return;
    if (auth instanceof Response) return;
    const { user, supabase } = auth;

    const body = await request.json();
    // Validation...

    const { data, error } = await supabase.from("table").insert({...});

    if (error) {
        return jsonError("Failed message", 500, error.code, error.message);
    }

    return jsonSuccess({ data }, 201);
}
```

### API Response Helpers

**File:** `src/lib/api-response.ts`

| Helper | Purpose |
|--------|---------|
| `jsonSuccess<T>(data, status)` | Returns `{ data, error: null }` with status code |
| `jsonError(message, status, code?, details?)` | Returns `{ data: null, error: { message, code, details } }` |
| `authenticateRequest(request, getClient)` | Validates Bearer token, returns user + supabase client |

### Dynamic Route Parameters

```typescript
type RouteParams = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
    const { organizationId } = await params;
    // ...
}
```

### Route File Naming

| Pattern | File |
|---------|------|
| Single resource | `/api/strains/route.ts` |
| Resource with ID | `/api/organizations/[organizationId]/route.ts` |
| Nested action | `/api/strains/[id]/image/route.ts` |

## Component Patterns

### Functional Components with Memo

```typescript
// src/components/strains/strain-card.tsx
import { memo } from 'react';

interface StrainCardProps {
  strain: Strain;
  index?: number;
  isCollected?: boolean;
}

export const StrainCard = memo(function StrainCard({ strain, index = 0, isCollected = true }: StrainCardProps) {
  // Component logic...
});
```

### Client Components

```typescript
// "use client" directive at top of file
"use client";

import { useState } from "react";
```

### Context Providers

```typescript
// src/components/auth-provider.tsx
interface AuthContextType {
  user: User | null;
  loading: boolean;
  // ...
}

const AuthContext = createContext<AuthContextType>({ /* defaults */ });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Provider implementation
};

export const useAuth = () => useContext(AuthContext);
```

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

```typescript
const { data, error } = await supabase.from("table").select(...);

if (error) {
    console.error("Error message:", error);
    return jsonError("User-friendly message", 500, error.code, error.message);
}
```

## Logging

### Server-Side (API Routes)

```typescript
console.error("Error creating strain:", strainError);
console.log('[DEBUG] Attempting to write activity for strain:', strain.name);
```

### Client-Side (React Components)

```typescript
// Avoid console.log in production-ready code
// Use React Query DevTools or debugging tools instead
```

## React Query Usage

**Package:** `@tanstack/react-query` v5

### Query Structure

```typescript
const query = useQuery({
  queryKey: ["collection", user?.id],
  queryFn: () => fetchFullCollection(user!.id),
  enabled: !!user,
});
```

### Mutation Structure

```typescript
const mutation = useMutation({
  mutationFn: async ({ strainId, opts }: { strainId: string; opts?: Options }) => {
    // mutation logic
  },
  onMutate: async (variables) => {
    // Optimistic update
  },
  onError: (err, vars, context) => {
    // Rollback on error
  },
  onSettled: () => {
    // Refetch after mutation
  },
});
```

## Supabase Client Patterns

| Context | Client | File |
|---------|--------|------|
| Browser/Client | Singleton via Proxy | `@/lib/supabase/client` |
| Server Components | Per-request | `@/lib/supabase/server` |
| Admin operations | Service role | `@/lib/supabase/client` with `SUPABASE_SERVICE_ROLE_KEY` |

### Browser Client (Lazy Singleton)

```typescript
// src/lib/supabase/client.ts
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getClient()[prop as keyof SupabaseClient];
  },
});
```

### Authenticated Client for API Routes

```typescript
import { getAuthenticatedClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
    const supabase = await getAuthenticatedClient(accessToken);
    const { data: { user } } = await supabase.auth.getUser();
    // ...
}
```

## TypeScript Patterns

### Interface Definitions

**File:** `src/lib/types.ts`

```typescript
export interface Strain {
  id: string;
  name: string;
  slug: string;
  type: 'indica' | 'sativa' | 'hybrid' | 'ruderalis';
  avg_thc?: number;
  // ...
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'gründer' | 'admin' | 'member' | 'viewer';
  // ...
}
```

### Type Exports from Interfaces

```typescript
export type StrainSource = 'pharmacy' | 'street' | 'grow' | 'csc' | 'other';
export type OrganizationActivityEventType =
  | 'strain_added'
  | 'strain_updated'
  // ...
```

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

---

*Convention analysis: 2026-04-03*
