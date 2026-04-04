# GreenLog

## What This Is

B2B multi-tenant platform for cannabis clubs (CSCs) and pharmacies to manage strains, collections, and organizations. Users track their favorite strains, rate them, and share within their organization or publicly with followers.

**Validated capabilities (MVP):** Auth, strain database (470+), collections, ratings, social follows/feed, badge system, GDPR compliance, organization management, analytics dashboard.

## Core Value

Reliable strain data management with fast, consistent UI — mutations (collect, follow, rate) reflect immediately everywhere via centralized cache invalidation.

## Requirements

### Validated

- ✓ Multi-tenant auth with role-based access (gründer, admin, member, viewer) — April 2026
- ✓ Strain database with 470+ strains, images, farmer/breeder data — April 2026
- ✓ Collection system with private notes and batch tracking — April 2026
- ✓ Social follows, activity feed, follower notifications — April 2026
- ✓ Badge system (26 badges across Collection, Grow, Social, Engagement) — April 2026
- ✓ GDPR compliance (consent, data export, account deletion) — April 2026
- ✓ Organization management with invite system — April 2026
- ✓ Organization analytics with CSV export — April 2026
- ✓ React Query Provider + useCollection hooks (partial) — April 2026

### Active

- [ ] **RQ-01**: Strains page fetches via useQuery instead of useEffect
- [ ] **RQ-02**: Collection page uses React Query with consistent query keys
- [ ] **RQ-03**: Follow/unfollow mutations invalidate follow queries
- [ ] **RQ-04**: Rate/add relation mutations invalidate strain queries
- [ ] **RQ-05**: Loading/error states consistent across all data-fetching pages

### Out of Scope

- **Grows/Eigenanbau-Tracker** — Legal clarification in Germany pending
- **PWA / App-Store readiness** — Not started, deferred after React Query
- **Real-time WebSocket updates** — Using polling (30s interval), not urgent

## Context

### Current State (April 2026)

GreenLog MVP is complete. The codebase uses:
- **Next.js 16 Pages Router** with TypeScript and Tailwind CSS
- **Supabase** for PostgreSQL, Auth, Storage, and RLS
- **React Query** (`@tanstack/react-query`) partially integrated — `QueryProvider` exists, `useCollection`/`useCollectionIds` hooks use it, but main pages (strains, collection, strain detail) still use `useEffect + supabase.from`

### Problem to Solve

Server state is fetched directly in components with `useEffect`. This leads to:
- No centralized caching strategy
- Inconsistent loading/error states
- Potential N+1 queries on re-fetches
- Mutations don't automatically refetch related queries

### Opportunity

React Query is already in the tree (`QueryProvider` configured). The `useCollection`/`useCollectionIds` hooks prove the pattern works. Finishing the integration standardizes all data fetching.

## Constraints

- **Pages Router**: No Server Components — all data fetching is Client Components
- **Existing hooks**: `useCollection` and `useCollectionIds` must continue working
- **QueryProvider**: Already wraps the app — don't reconfigure the provider itself
- **Demo mode**: Must work without Supabase connection (simulated data)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Query via @tanstack/react-query | Already in package.json, QueryProvider exists | ✓ Good |
| Partial migration (not full) | MVP stable, React Query only where it adds value | ✓ Good |
| Query keys: `['strains']`, `['strain', id]`, `['collection', userId]` | Hierarchical, matches existing collection hook pattern | ✓ Good |
| Mutations invalidate parent queries | Standard cache invalidation, matches useCollection pattern | ✓ Good |
| Pages Router, not App Router | Project uses Pages Router — no migration | ✓ Good |

---

*Last updated: 2026-04-04 after React Query gap analysis*
