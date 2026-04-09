# Roadmap: GreenLog — React Query Integration

**Phase count:** 3 | **Requirements:** 14 v1 + 4 v2 + 4 OMA | **Generated:** 2026-04-04

## Phase 1: React Query Core Integration

**Goal:** Replace all `useEffect + supabase.from` patterns with `useQuery`, add centralized query keys and consistent invalidation.

**Plans:** 5/5 plans complete

### Plans:

- [x] 01-01-PLAN.md — Create centralized query-keys.ts
- [x] 01-02-PLAN.md — Convert strains page to useQuery
- [x] 01-03-PLAN.md — Convert strain detail page to useQuery
- [x] 01-04-PLAN.md — Convert FollowButton to useQuery with cache invalidation
- [x] 01-05-PLAN.md — Consistent loading/error states across pages

### Requirements (RQ-01 — RQ-14)

| ID | Requirement |
|----|-------------|
| RQ-01 | Strains page fetches via useQuery |
| RQ-02 | Filter changes trigger refetch via query key |
| RQ-03 | Pagination via keepPreviousData |
| RQ-04 | Collection page uses useQuery |
| RQ-05 | Collect/uncollect invalidates collection queries |
| RQ-06 | Strain detail fetches via useQuery |
| RQ-07 | Rating mutations invalidate strain queries |
| RQ-08 | User relation mutations invalidate strain queries |
| RQ-09 | Follow mutations invalidate follow queries |
| RQ-10 | Follow requests invalidate follow-requests |
| RQ-11 | Consistent loading states (skeleton/shimmer) |
| RQ-12 | Consistent error states with retry |
| RQ-13 | Centralized query-keys.ts |
| RQ-14 | No demo mode regression |

### Success Criteria

1. Strains page (`/strains`) loads via `useQuery(['strains', filters])` — no useEffect pattern
2. Collection page (`/collection`) uses `useQuery(['collection', userId])` — existing hooks still work
3. Strain detail (`/strains/[slug]`) loads via `useQuery(['strain', slug])`
4. Collect button → collection queries invalidated + UI updates within 1 second
5. Follow button → follow queries invalidated + feed updates
6. All pages show skeleton loading states during fetch
7. All pages show error state with retry button on failure
8. `src/lib/query-keys.ts` exports all query key factories
9. Demo mode (no Supabase) works without errors

---

## Phase 2: React Query Advanced

**Goal:** Prefetching, infinite scroll, offline support.

**Plans:** 3/3 plans executed

### Plans:

- [x] 02-01-PLAN.md — Verify Collection page React Query (RQ-04, RQ-05)
- [x] 02-02-PLAN.md — Infinite scroll for strains list (RQ-16)
- [x] 02-03-PLAN.md — Optimistic updates for follow/unfollow (RQ-18)

### Requirements (RQ-15 — RQ-18)

| ID | Requirement |
|----|-------------|
| RQ-15 | Prefetch strain details on hover |
| RQ-16 | Infinite scroll / cursor pagination for strains |
| RQ-17 | Offline support via persistence |
| RQ-18 | Optimistic updates for follow/unfollow |

### Phase 2 Success Criteria

1. Collection page verified using useQuery with centralized query keys
2. Strains list uses `useInfiniteQuery` for cursor pagination
3. User scrolls down → more strains load automatically
4. Filter changes → infinite scroll resets to first page
5. Follow button updates immediately on click (optimistic)
6. Follow error → button reverts, user sees error alert
7. Demo mode continues to work without errors

---

## Phase 3: Organization Member Approval

**Goal:** Implement optional manual member approval for organizations, allowing clubs to verify members or require paid access before granting membership.

**Plans:** 2/4 plans executed

### Plans:

- [x] 03-01-PLAN.md — Database schema migration (requires_member_approval, pending status, RLS updates)
- [x] 03-02-PLAN.md — API routes (membership-request POST, approve PATCH, reject PATCH)
- [x] 03-03-PLAN.md — Organization settings toggle UI
- [x] 03-04-PLAN.md — Admin pending-members page UI with approve/reject actions

### Requirements (OMA-01 — OMA-04)

| ID | Requirement |
|----|-------------|
| OMA-01 | `requires_member_approval` flag on organizations table |
| OMA-02 | Pending membership status (pending, approved, rejected) |
| OMA-03 | Admin approval UI (pending members list, approve/reject actions) |
| OMA-04 | API routes for membership approval workflow |

### Phase 3 Success Criteria

1. Organizations can optionally enable `requires_member_approval`
2. New members requesting to join go to `pending` status when enabled
3. Admins can view pending requests and approve/reject
4. Approved members get full access; rejected see reason
5. Existing members without approval enabled keep current access

---

## Phase 4: Clerk Social Login Integration

**Goal:** Replace Supabase-only email/password auth with Clerk social login (Google OAuth) as primary auth provider, while preserving existing Supabase auth for database sessions.

**Plans:** 1/1 plan created

### Plans:

- [x] 04-01-PLAN.md — Clerk SDK install, ClerkProvider setup, middleware, sign-in/sign-up pages, env vars, Google OAuth

### Requirements (CSL-01 — CSL-08)

| ID | Requirement |
|----|-------------|
| CSL-01 | Clerk SDK (@clerk/nextjs v7) installieren |
| CSL-02 | ClerkProvider in layout.tsx einrichten |
| CSL-03 | clerkMiddleware() in middleware.ts |
| CSL-04 | /sign-in Page mit Clerk SignIn Component |
| CSL-05 | /sign-up Page mit Clerk SignUp Component |
| CSL-06 | Environment Variables CLERK_SECRET_KEY + NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY |
| CSL-07 | Google OAuth in Clerk Dashboard aktivieren |
| CSL-08 | Build verification (npm run build) |

### Phase 4 Success Criteria

1. @clerk/nextjs v7 listed in package.json
2. ClerkProvider wraps app content in layout.tsx
3. middleware.ts uses clerkMiddleware() with rate limiting preserved
4. /sign-in page renders Clerk SignIn with Google OAuth button
5. /sign-up page renders Clerk SignUp with Google + email/password
6. .env.example documents both Clerk env vars
7. Google OAuth enabled in Clerk Dashboard (human-verified)
8. npm run build exits with code 0

---

## Out of Scope

| Item | Reason |
|------|--------|
| User Migration (existing Supabase users) | No migration — Supabase auth stays for existing users |
| Clerk Webhooks for Supabase Profile Sync | Deferred post-Phase 04 |
| Apple/Microsoft/GitHub OAuth | Only Google in scope for Phase 04 |
| SSO / SAML (Enterprise) | Out of scope for MVP |
| Grows/Eigenanbau-Tracker | Legal clarification in Germany pending |
| PWA / App-Store | Not started, deferred post-React-Query |
| Real-time WebSocket | 30s polling sufficient for MVP |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RQ-01, RQ-02, RQ-03, RQ-14 | Phase 1 | Done (01-02) |
| RQ-04 — RQ-05 | Phase 1 | Done (verify in 02-01) |
| RQ-06, RQ-07, RQ-08 | Phase 1 | Done (01-03) |
| RQ-09, RQ-10, RQ-14 | Phase 1 | Done (01-04) |
| RQ-11, RQ-12 | Phase 1 | Done (01-05) |
| RQ-13 | Phase 1 | Done (01-01) |
| RQ-15 | Phase 2+ | Deferred |
| RQ-16 | Phase 2 | Done (02-02) |
| RQ-17 | Phase 2+ | Deferred |
| RQ-18 | Phase 2 | Done (02-03) |
| OMA-01, OMA-02 | Phase 3 | Done (03-01) |
| OMA-03 | Phase 3 | Planned (03-03, 03-04) |
| OMA-04 | Phase 3 | Planned (03-02) |
| CSL-01 — CSL-08 | Phase 4 | Planned (04-01) |

**Overall v1 coverage:** 14/14 requirements mapped + 4 OMA planned
**Phase 2 coverage:** 2/4 requirements planned (R-15, R-17 deferred)
**Phase 3 coverage:** 4/4 OMA requirements planned
**Phase 4 coverage:** 8/8 CSL requirements planned
