# GreenLog Opus Full Review & Refactor

**Date:** 2026-04-16
**Scope:** Entire repository
**Approach:** Risk-First (Security → Data → Code → Performance → UX)
**Depth:** Full Refactor — findings documented AND fixed

---

## Context

GreenLog migrated from MiniMax M2.7 to Claude Opus 4.6. This review leverages Opus to systematically audit and improve the entire codebase across all layers.

**Project stats:**
- 61 API routes, 94 components, 63 SQL migrations
- Schema: 628 lines, Types: 486 lines
- Recent changes: CSC Compliance Module, Clerk → Supabase Auth migration
- Build status: Clean (no errors)

---

## Phase 1: Security Audit & Fixes

**Priority:** P0 — Critical
**Goal:** Ensure no exploitable vulnerabilities exist.

### 1.1 RLS Policies
- Audit every table in `supabase-schema.sql` + all 63 migrations
- Check for: missing policies, overly permissive SELECT/INSERT/UPDATE/DELETE, policy bypass via service role leaks
- Verify `is_active_org_member()` SECURITY DEFINER helper is used correctly and cannot be abused

### 1.2 Auth Flows
- Verify Supabase Auth integration post-Clerk migration
- Check session handling, token validation in all API routes
- Ensure `authenticateRequest()` is used consistently across all 61 routes
- Check for routes that skip auth entirely (intentional vs. accidental)

### 1.3 API Input Validation
- All 61 routes: check for missing input validation
- SQL injection vectors via Supabase client (parameterized queries?)
- XSS vectors in user-generated content (strain reviews, org names, profile fields)
- IDOR (Insecure Direct Object Reference) — can users access other users' data by guessing IDs?

### 1.4 CSC Compliance Integrity
- KCanG Hard-Block-Trigger: verify 25g/50g/30g limits cannot be circumvented
- THC 10% limit for 18-21 year olds — is age calculation correct?
- DB trigger vs. application-level enforcement — are both in place?

### 1.5 Storage Security
- `strains-images` bucket: upload route auth, MIME validation, file size limits
- Check for path traversal in storage operations

**Deliverable:** All critical security fixes committed. Audit findings documented.

---

## Phase 2: Data Integrity & Schema Consistency

**Priority:** P0 — Critical
**Goal:** Schema, types, and constraints are consistent and complete.

### 2.1 Schema ↔ Types Sync
- Compare every table in `supabase-schema.sql` with interfaces in `src/lib/types.ts`
- Find: missing fields, wrong types, stale interfaces for removed columns

### 2.2 Migration Consistency
- Review 63 migrations for contradictions or missing rollback safety
- Check for migrations that add columns without defaults on existing rows

### 2.3 Missing Constraints
- NOT NULL where data should never be null
- CHECK constraints (e.g., rating 1-5, THC 0-100)
- UNIQUE constraints where duplicates would be invalid
- Foreign key ON DELETE behavior (CASCADE vs. SET NULL vs. RESTRICT)

### 2.4 Missing Indexes
- Identify frequent query patterns from API routes
- Add composite indexes for common WHERE + ORDER BY combinations
- Check `follows(follower_id, following_id)` composite index exists

### 2.5 Orphan Data
- References to deleted users/orgs without CASCADE
- Stale data from Clerk migration (old user IDs?)

**Deliverable:** New migration with fixes, updated types, schema doc refreshed.

---

## Phase 3: Code Quality & Dead Code Removal

**Priority:** P1 — Important
**Goal:** Clean, consistent, well-typed codebase.

### 3.1 Dead Code
- Unreferenced components, unused API routes, orphaned imports
- Clerk remnants after auth migration
- Deprecated `collection-events.ts` — still imported anywhere?

### 3.2 Pattern Consistency
- All API routes use `jsonSuccess()`/`jsonError()` helpers
- All auth checks use `authenticateRequest()` consistently
- Error response format uniform across all endpoints

### 3.3 TypeScript Strictness
- Eliminate `any` types
- Add missing return types to exported functions
- Check for `@ts-ignore` / `@ts-expect-error` suppressions that can be resolved

### 3.4 Grows Code (Paused)
- Review state of grows-related code
- Clean up but preserve — clearly isolate paused feature code
- Ensure grows code doesn't affect bundle size of active features

### 3.5 Import Hygiene
- Circular dependency detection
- Barrel file optimization (are re-exports causing unnecessary bundling?)

**Deliverable:** Cleaned codebase, no dead code, consistent patterns, strict types.

---

## Phase 4: Performance & Architecture

**Priority:** P1 — Important
**Goal:** Faster queries, smaller bundles, fewer re-renders.

### 4.1 Database Query Optimization
- Find N+1 query patterns in API routes (loops with individual queries)
- Replace with JOINs, batch queries, or `IN` clauses
- Check for missing `.select()` specificity (selecting `*` when only 2 fields needed)

### 4.2 React Query Optimization
- Cache invalidation: are mutations properly invalidating related queries?
- Stale time tuning per query type (strains rarely change, notifications change often)
- Prefetching for predictable navigation patterns

### 4.3 Component Re-render Prevention
- Identify components that re-render excessively
- Missing `React.memo`, unstable callback references, context over-subscription
- Large lists without virtualization

### 4.4 Bundle Size
- Tree-shaking verification (lucide-react, framer-motion, date-fns)
- Dynamic imports for heavy components (Tesseract.js already lazy — others?)
- Route-level code splitting effectiveness

### 4.5 Middleware & Rate Limiting
- Verify rate limiting works correctly in production
- Check middleware performance impact

**Deliverable:** Optimized queries, leaner bundle, smoother UI.

---

## Phase 5: UX & Edge Cases

**Priority:** P2 — Nice to have
**Goal:** Robust user experience, no blank screens.

### 5.1 Error Handling
- Error boundaries at route level
- API error → user-facing message mapping
- Network failure handling (offline, timeout)

### 5.2 Loading States
- Consistent skeleton loaders or spinners
- No layout shift during data loading
- Suspense boundaries where appropriate

### 5.3 Accessibility
- Keyboard navigation for key flows
- ARIA labels on interactive elements
- Color contrast for cannabis-themed dark UI
- Screen reader compatibility for strain cards, ratings

### 5.4 Edge Cases
- Empty states: org with no members, user with no strains, no search results
- Profile without avatar, strain without image
- Very long text (org names, strain descriptions, reviews)

### 5.5 Mobile / Capacitor
- Touch target sizes (min 44px)
- Safe area insets
- Capacitor-specific quirks

**Deliverable:** Polished UX, accessible, handles edge cases gracefully.

---

## Execution Strategy

1. Each phase is a separate branch + commit (or set of commits)
2. Build check after each phase — must stay green
3. Phase 1 & 2 are blocking — must complete before Phase 3-5
4. Phase 3-5 can be parallelized if needed
5. Each phase produces a brief findings summary in the commit message

## Success Criteria

- Zero known security vulnerabilities after Phase 1
- Schema and types 100% in sync after Phase 2
- No `any` types, no dead code after Phase 3
- No N+1 queries, bundle size reduced after Phase 4
- No blank error screens, keyboard-navigable after Phase 5
