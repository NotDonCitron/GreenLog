# Implementation Plan: Opus Full Review & Refactor

**Spec:** `docs/superpowers/specs/2026-04-16-opus-full-review-design.md`
**Date:** 2026-04-16
**Approach:** 5 Phases, risk-first. P1/P2 blocking, P3-P5 parallelizable.

---

## Phase 1: Security Audit & Fixes (P0)

### 1.1 RLS Policy Audit

**Files:** `supabase-schema.sql`, `supabase/migrations/*.sql`

| Step | Action | Details |
|------|--------|---------|
| 1.1.1 | List all tables and their RLS status | Parse schema + migrations, build matrix: table → SELECT/INSERT/UPDATE/DELETE policies |
| 1.1.2 | Identify tables with missing policies | Cross-check: every table with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` must have at least SELECT policy |
| 1.1.3 | Check for overly permissive policies | Flag: `USING (true)` on sensitive tables, `WITH CHECK (true)` on INSERT/UPDATE |
| 1.1.4 | Audit `is_active_org_member()` usage | Confirm SECURITY DEFINER is set, search for direct membership checks that bypass the helper |
| 1.1.5 | Write fix migration | `supabase/migrations/20260416_phase1_rls_fixes.sql` |

### 1.2 Auth Flow Audit

**Files:** `src/lib/supabase/server.ts`, `src/app/api/**/route.ts`

| Step | Action | Details |
|------|--------|---------|
| 1.2.1 | Grep all API routes for auth patterns | Collect: which routes use `authenticateRequest()`, `getUser()`, or neither |
| 1.2.2 | Classify routes: auth-required vs public | Document intentionally public routes (e.g., GET strains listing) |
| 1.2.3 | Fix routes missing auth | Add `authenticateRequest()` where missing |
| 1.2.4 | Check Clerk remnants in auth flow | Search for `clerk`, `@clerk`, `ClerkProvider` references |

### 1.3 API Input Validation

**Files:** All 61 `route.ts` files under `src/app/api/`

| Step | Action | Details |
|------|--------|---------|
| 1.3.1 | Audit body parsing | Check: `request.json()` without validation, missing type narrowing |
| 1.3.2 | Check for raw string interpolation in queries | Supabase JS client is parameterized, but check `.rpc()` calls and raw SQL |
| 1.3.3 | XSS in user content | Check: strain reviews, org names, profile bios — are they escaped on render? |
| 1.3.4 | IDOR checks | Verify: resource ownership checked before returning data (e.g., `/api/organizations/[id]` checks membership) |

### 1.4 CSC Compliance Verification

**Files:** `src/app/api/organizations/[organizationId]/csc/**`, CSC migrations

| Step | Action | Details |
|------|--------|---------|
| 1.4.1 | Trace KCanG limit enforcement | Confirm DB trigger exists for 25g/30d, 50g/30d, 30g/month limits |
| 1.4.2 | Verify age calculation | Check `date_of_birth` → age → THC 10% limit for 18-21 |
| 1.4.3 | Test bypass vectors | Can limits be circumvented by calling API directly? Check both trigger AND route validation |

### 1.5 Storage Security

**Files:** `src/app/api/strains/[id]/image/route.ts`, storage bucket config

| Step | Action | Details |
|------|--------|---------|
| 1.5.1 | Check upload auth | Verify `APP_ADMIN_IDS` check cannot be bypassed |
| 1.5.2 | MIME + size validation | Confirm server-side validation (not just client) |
| 1.5.3 | Path traversal | Check filenames are sanitized (no `../` in storage paths) |

**Branch:** `review/phase1-security`
**Commit after:** Build must pass.

---

## Phase 2: Data Integrity & Schema Consistency (P0)

### 2.1 Schema ↔ Types Sync

**Files:** `supabase-schema.sql`, `src/lib/types.ts`

| Step | Action | Details |
|------|--------|---------|
| 2.1.1 | Extract all table columns from schema | Parse CREATE TABLE statements, build column→type map |
| 2.1.2 | Extract all interfaces from types.ts | Parse TypeScript interfaces, build field→type map |
| 2.1.3 | Diff the two | Report: missing fields, wrong types, stale interfaces |
| 2.1.4 | Update `types.ts` | Add missing fields, fix wrong types, remove stale ones |

### 2.2 Migration Review

**Files:** `supabase/migrations/*.sql` (63 files)

| Step | Action | Details |
|------|--------|---------|
| 2.2.1 | Scan for ALTER TABLE ADD COLUMN without DEFAULT | These fail on existing rows if NOT NULL — check each |
| 2.2.2 | Check for contradicting migrations | Column added then removed, type changed multiple times |
| 2.2.3 | Verify DROP statements have IF EXISTS | Prevent migration failures on re-run |

### 2.3 Missing Constraints

| Step | Action | Details |
|------|--------|---------|
| 2.3.1 | Audit nullable columns | `ratings.rating` should be NOT NULL + CHECK(1-5), `thc_percentage` CHECK(0-100) |
| 2.3.2 | Check UNIQUE constraints | `follows(follower_id, following_id)` unique, `organization_members(org_id, user_id)` unique |
| 2.3.3 | Audit ON DELETE behavior | Profiles deletion → CASCADE ratings? SET NULL follows? Document decisions |

### 2.4 Index Audit

| Step | Action | Details |
|------|--------|---------|
| 2.4.1 | Identify hot query patterns | Read top API routes, extract WHERE/ORDER BY/JOIN patterns |
| 2.4.2 | Check existing indexes | Compare against query patterns |
| 2.4.3 | Add missing indexes | Composite indexes for frequent filter+sort combos |

### 2.5 Orphan Data

| Step | Action | Details |
|------|--------|---------|
| 2.5.1 | Check for Clerk user ID references | Old `user_3C7BE3Di...` format in any tables |
| 2.5.2 | Check FK integrity | Any foreign keys pointing to deleted rows? |

**Branch:** `review/phase2-data`
**Migration:** `supabase/migrations/20260416_phase2_data_integrity.sql`
**Commit after:** Build must pass.

---

## Phase 3: Code Quality & Dead Code (P1)

### 3.1 Dead Code Removal

| Step | Action | Details |
|------|--------|---------|
| 3.1.1 | Find unused components | Grep each component's export, check if imported anywhere |
| 3.1.2 | Find unused API routes | Check if any route.ts is never called from client code |
| 3.1.3 | Remove Clerk remnants | Search `clerk`, `@clerk/`, `ClerkProvider`, `CLERK_` — remove all |
| 3.1.4 | Check `collection-events.ts` | Marked deprecated — verify zero imports, then delete |
| 3.1.5 | Clean grows code | Isolate paused code, ensure no active imports from grows modules |

### 3.2 Pattern Consistency

| Step | Action | Details |
|------|--------|---------|
| 3.2.1 | Audit API response format | Every route must use `jsonSuccess()`/`jsonError()` — find and fix stragglers |
| 3.2.2 | Audit auth pattern | Every protected route must use `authenticateRequest()` |
| 3.2.3 | Standardize error codes | Consistent HTTP status codes for same error types across routes |

### 3.3 TypeScript Strictness

| Step | Action | Details |
|------|--------|---------|
| 3.3.1 | Eliminate `any` | Grep for `: any`, `as any`, `<any>` — replace with proper types |
| 3.3.2 | Add return types | Exported functions without explicit return types |
| 3.3.3 | Resolve suppressions | Check `@ts-ignore` / `@ts-expect-error` — fix underlying issues |

### 3.4 Import Hygiene

| Step | Action | Details |
|------|--------|---------|
| 3.4.1 | Unused imports | ESLint should catch these — run `npm run lint` and fix |
| 3.4.2 | Circular deps | Check for A→B→A import chains |

**Branch:** `review/phase3-quality`

---

## Phase 4: Performance & Architecture (P1)

### 4.1 Query Optimization

| Step | Action | Details |
|------|--------|---------|
| 4.1.1 | Find N+1 patterns | Search API routes for queries inside loops |
| 4.1.2 | Optimize SELECT specificity | Replace `.select('*')` with specific columns where possible |
| 4.1.3 | Batch queries | Replace sequential queries with `Promise.all()` where independent |

### 4.2 React Query Tuning

| Step | Action | Details |
|------|--------|---------|
| 4.2.1 | Audit cache invalidation | Check mutations properly invalidate affected query keys |
| 4.2.2 | Tune stale times | Strains: longer stale time (5min). Notifications: shorter (15s) |
| 4.2.3 | Add prefetching | Prefetch strain detail on card hover, next page on pagination |

### 4.3 Re-render Prevention

| Step | Action | Details |
|------|--------|---------|
| 4.3.1 | Identify hot components | Components rendered in lists (StrainCard, etc.) — check memo usage |
| 4.3.2 | Stabilize callbacks | `useCallback` for handlers passed as props |
| 4.3.3 | Context splitting | If AuthProvider causes wide re-renders, split into separate contexts |

### 4.4 Bundle Size

| Step | Action | Details |
|------|--------|---------|
| 4.4.1 | Analyze bundle | `npm run build` — check route sizes in output |
| 4.4.2 | Dynamic imports | Heavy libs (framer-motion animations, date pickers) — lazy load where feasible |
| 4.4.3 | Icon tree-shaking | Verify lucide-react imports are specific (`import { Heart }`) not barrel |

### 4.5 Middleware

| Step | Action | Details |
|------|--------|---------|
| 4.5.1 | Check rate limiter | Verify `middleware.ts` rate limiting works correctly |
| 4.5.2 | Measure overhead | Ensure middleware doesn't add unnecessary latency |

**Branch:** `review/phase4-performance`

---

## Phase 5: UX & Edge Cases (P2)

### 5.1 Error Handling

| Step | Action | Details |
|------|--------|---------|
| 5.1.1 | Add error boundaries | Route-level error boundaries for key pages |
| 5.1.2 | User-facing error messages | Map API errors to German user-friendly messages |
| 5.1.3 | Offline handling | Graceful degradation when Supabase unreachable |

### 5.2 Loading States

| Step | Action | Details |
|------|--------|---------|
| 5.2.1 | Audit loading UX | Each page: what shows during load? Blank? Spinner? Skeleton? |
| 5.2.2 | Add skeletons | Key pages: strains list, profile, organization dashboard |
| 5.2.3 | Prevent layout shift | Reserve space for images, cards during load |

### 5.3 Accessibility

| Step | Action | Details |
|------|--------|---------|
| 5.3.1 | Keyboard nav | Tab order on strain cards, filter panel, follow button |
| 5.3.2 | ARIA labels | Interactive elements: buttons, modals, dropdowns |
| 5.3.3 | Color contrast | Dark theme: verify text readable against dark backgrounds |

### 5.4 Edge Cases

| Step | Action | Details |
|------|--------|---------|
| 5.4.1 | Empty states | Org with 0 members, 0 strains, 0 search results — show helpful message |
| 5.4.2 | Missing data | Profile without avatar, strain without image — fallback UI |
| 5.4.3 | Long text | Truncation for org names, strain descriptions, reviews |

### 5.5 Mobile

| Step | Action | Details |
|------|--------|---------|
| 5.5.1 | Touch targets | Min 44px for all tappable elements |
| 5.5.2 | Safe area | Capacitor safe-area-inset handling |

**Branch:** `review/phase5-ux`

---

## Execution Order

```
Phase 1 (Security) ──→ Phase 2 (Data) ──→ Phase 3 (Code Quality)
                                      ├──→ Phase 4 (Performance)
                                      └──→ Phase 5 (UX)
```

**Phase 1 → 2:** Sequential, blocking. Security first, then data integrity.
**Phase 3/4/5:** Can run in parallel after Phase 2 completes.

## Per-Phase Workflow

1. Create branch from `main`
2. Run audit (read-only analysis)
3. Document findings in commit message
4. Apply fixes
5. `npm run build` — must pass
6. `npm run lint` — must pass
7. Commit with detailed findings summary
8. Merge to `main` before next blocking phase

## Success Criteria

| Phase | Metric |
|-------|--------|
| 1 | Zero known security vulnerabilities, all routes auth-checked |
| 2 | Schema ↔ types 100% sync, constraints complete |
| 3 | Zero `any` types, zero dead code, zero Clerk remnants |
| 4 | No N+1 queries, bundle size measured and reduced |
| 5 | No blank error screens, keyboard-navigable key flows |
