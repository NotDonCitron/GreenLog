# Codebase Concerns

**Analysis Date:** 2026-04-03

---

## Paused Features

### Grow-Tracker (PAUSED)
- **Status:** All grow features are paused due to legal uncertainty in Germany
- **Files affected:**
  - `src/app/grows/page.tsx` - UI still accessible, shows "Grow Tracker" header
  - `src/app/grows/new/page.tsx` - Form still functional, creates grow entries in DB
  - `src/app/grows/[id]/page.tsx` - 494 lines, grow detail view
  - `supabase-schema.sql` lines 462-465 - `grows` and `grow_entries` tables exist
- **Risk:** Features remain in codebase but should not be marketed or extended
- **Fix approach:** Await legal clarification before any grow-related development

---

## Legal & Compliance

### Impressum (Incomplete)
- **File:** `src/app/(legal)/impressum/page.tsx`
- **Issue:** Contains placeholder content - Betreiber name/address not decided
- **Impact:** Legal requirement for German websites (TMG, RStV)
- **Fix approach:** Team must decide operator name, address, responsible person per § 55 RStV

### AGB (Terms - Minimal)
- **File:** `src/app/(legal)/agb/page.tsx`
- **Issue:** Contains basic sections but missing critical content:
  - Widerrufsrecht (Right of withdrawal)
  - Zahlungsbedingungen (Payment terms)
  - Sanktionsklausel (Sanctions clause for cannabis industry)
- **Impact:** Incomplete for B2B cannabis industry in Germany
- **Fix approach:** Have a lawyer review and complete before production launch

### GDPR Compliance Status
- **Files:** `src/app/api/gdpr/delete/route.ts`, `src/app/api/gdpr/export/route.ts`, `src/app/api/gdpr/consent/route.ts`
- **Status:** GDPR routes exist and appear functional
- **Concern:** GDPR tables (`gdpr_deletion_requests`, `gdpr_export_jobs`, `user_consents`) referenced but not found in schema
- **Recommendation:** Verify these tables exist in Supabase or are created via migration

### EU-US Data Transfer
- **Issue:** Supabase (Ireland) and Vercel may use US infrastructure
- **Fix approach:** Verify EU-US Data Privacy Framework status or implement SCCs

---

## Security Considerations

### Admin Seed Page Access Control
- **File:** `src/app/admin/seed/page.tsx`
- **Issue:** Only checks `if (!user) return` - no role verification
- **Risk:** Any authenticated user could seed strains (though limited impact)
- **Fix approach:** Add admin role check or move to protected admin section

### APP_ADMIN_IDS Pattern
- **Files:** `src/app/api/strains/[id]/image/route.ts`, `src/app/strains/[slug]/StrainDetailPageClient.tsx`
- **Pattern:** `APP_ADMIN_IDS` env var contains comma-separated user IDs
- **Concern:** Client-side admin check uses `NEXT_PUBLIC_APP_ADMIN_IDS` (exposed to browser)
- **Current:** Used for strain image override and edit functionality
- **Fix approach:** Keep sensitive operations server-side only

### Demo Mode
- **Files:** `src/components/auth-provider.tsx`, multiple pages check `isDemoMode`
- **Risk:** Demo mode bypasses auth for many features
- **Mitigation:** Demo mode is intentionally user-activated via localStorage
- **Concern:** Can access read-only views of data without authentication

### Push Notifications (Web-Push)
- **Files:** `src/lib/push.ts`, `src/hooks/usePushSubscription.ts`
- **Issue:** VAPID keys required but may not be configured
- **Fix approach:** Gracefully skipped when not configured (already implemented)

---

## Performance Concerns

### Tesseract.js Bundle Size
- **File:** `src/app/scanner/page.tsx`
- **Issue:** OCR library loaded (~30MB) only when scanner page is accessed
- **Current:** Lazy loaded with dynamic import on page init
- **Risk:** Initial recognition on cold worker is slow
- **Fix approach:** Consider Web Worker for better UI responsiveness

### 30-Second Notification Polling
- **File:** Not directly visible, referenced in CLAUDE.md
- **Issue:** Notifications use polling instead of Supabase Realtime
- **Risk:** Users may not receive timely notifications
- **Fix approach:** Implement Supabase Realtime WebSocket for notifications

### Large Files (Complexity)
| File | Lines | Concern |
|------|-------|---------|
| `src/app/profile/profile-view.tsx` | 804 | High complexity, many responsibilities |
| `src/components/strains/create-strain-modal.tsx` | 699 | Complex form with multiple tabs |
| `src/app/strains/[slug]/StrainDetailPageClient.tsx` | 651 | Detail page with many features |
| `src/app/user/[username]/page.tsx` | 568 | User profile page |
| `src/app/profile/settings/page.tsx` | 530 | Settings page with many options |

**Fix approach:** Consider extracting sub-components or hooks

### N+1 Query Issues (Historical)
- **Status:** Fixed according to CLAUDE.md
- **Files affected:** `discover/page.tsx`, `suggested-users.tsx`
- **Pattern:** Previously fetching full data for each user in lists

---

## Technical Debt

### RLS Recursion Workaround
- **File:** `supabase-schema.sql` lines 11-19
- **Pattern:** `is_active_org_member()` function uses `SECURITY DEFINER`
- **Issue:** RLS policies calling membership checks caused recursion
- **Fix approach:** SECURITY DEFINER helper bypasses RLS (appropriate workaround)

### Composite Indexes Added in Migrations
- **Files:** `supabase/migrations/20260329160002_add_composite_indexes.sql`
- **Pattern:** Indexes added post-initial schema
- **Concern:** Schema may be hard to reproduce from single schema file
- **Fix approach:** Merge into main `supabase-schema.sql`

### tw-animate-css CSP Violation (Worktree Only)
- **Status:** Documented in CLAUDE.md as verified fixed in main branch
- **Worktree affected:** `community-hub`
- **Issue:** Turbopack injects JavaScript when CSS is imported
- **Fix approach:** Do not import tw-animate.css, use Tailwind animate classes

### Inconsistent useSearchParams Handling
- **Pattern:** Some pages use `useSearchParams()` directly, others wrap in Suspense
- **Risk:** `useSearchParams()` requires Suspense boundary in Next.js 16
- **Current:** Compare page uses Suspense boundary properly

---

## Missing Critical Features

### React Query / SWR Data Fetching
- **Status:** P2 priority from CLAUDE.md
- **Current:** Direct Supabase calls throughout
- **Risk:** No centralized caching or deduplication
- **Fix approach:** Implement React Query (already in dependencies as `@tanstack/react-query`)

### PWA / App-Store Readiness
- **Status:** P2 priority from CLAUDE.md
- **Current:** Standard Next.js app, no service worker for offline
- **Fix approach:** Add PWA manifest and service worker

### Missing AVV (Data Processing Agreement)
- **Issue:** Supabase and Vercel may require DPA for GDPR compliance
- **Fix approach:** Review Supabase Privacy/DPA at supabase.com/privacy

---

## Test Coverage Gaps

### No Unit Tests Detected
- **Status:** Playwright is in devDependencies but no test files found in main src/
- **Files:** `test-new-user.mjs` exists at root
- **Risk:** Core functionality (auth, GDPR, RLS) not tested
- **Fix approach:** Add unit tests for critical paths

### E2E Tests (Playwright)
- **Config:** `playwright.config.ts` likely exists, `e2e/` directory not confirmed
- **Coverage:** Unknown

---

## Dependency Risks

### External Image Service (pollinations.ai)
- **File:** `src/app/admin/seed/page.tsx`
- **Risk:** External AI image generation service dependency
- **Mitigation:** Falls back to placeholder if service unavailable

### Leafly Scraping
- **File:** `src/app/api/import/leafly/route.ts`
- **Risk:** Scraping external website may break if Leafly changes
- **Current:** Parses Leafly's __NEXT_DATA__ which is fragile

---

## Environment & Configuration

### Required Environment Variables
| Variable | Purpose | Risk if Missing |
|----------|---------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase connection | App breaks |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Auth breaks |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations | GDPR deletes fail |
| `VAPID_PUBLIC_KEY` | Push notifications | Push disabled |
| `VAPID_PRIVATE_KEY` | Push notifications | Push disabled |
| `APP_ADMIN_IDS` | Admin user IDs | Image override disabled |
| `NEXT_PUBLIC_APP_ADMIN_IDS` | Client-side admin check | UI admin features disabled |

---

## Debug Logging

### Console.log Usage
- **Pattern:** Significant `console.log`/`console.warn`/`console.error` in codebase
- **Files with logging:**
  - `src/app/api/strains/route.ts` - debug logging for activity writes
  - `src/app/api/badges/check/route.ts` - badge check errors
  - `src/hooks/usePushSubscription.ts` - push subscription flow
- **Risk:** Verbose logging in production
- **Fix approach:** Use structured logging with levels, disable in production

---

## Summary Priority Matrix

| Priority | Concern | Impact |
|----------|---------|--------|
| P0 | Impressum incomplete | Legal compliance |
| P0 | AGB incomplete | Legal compliance |
| P0 | Grow features paused | Legal risk if extended |
| P1 | GDPR table verification | Data protection |
| P1 | Test coverage | Code quality |
| P2 | Large files refactor | Maintainability |
| P2 | React Query adoption | Performance |
| P2 | PWA readiness | User experience |
| Low | Console logging cleanup | Production polish |

---

*Concerns audit: 2026-04-03*
