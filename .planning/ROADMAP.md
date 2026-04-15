# Roadmap: GreenLog — React Query Integration

**Phase count:** 6 | **Requirements:** 14 v1 + 4 OMA + 6 TRC + 15 GROW | **Generated:** 2026-04-12

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

## Phase 6: Grow-Diary & Community (Module A/B/C)

**Goal:** Private Grow-Diary (Module A), Public Grow-Community (Module B), and Harvest Certificate Export (Module C). KCanG § 9 compliant — max 3 active plants per user enforced via DB trigger.

### Requirements (GROW-01 — GROW-15)

| ID | Requirement |
|----|-------------|
| GROW-01 | `plants` table with plant_status enum + 3-plant LIMIT trigger (seedling/veg/flower/flushing count) |
| GROW-02 | `grow_milestones` table for phase tracking (germination → vegetation → flower → flush → harvest) |
| GROW-03 | `grow_presets` table with autoflower/photoperiod presets, PPFD values, light cycles |
| GROW-04 | `grow_entries` extended with `plant_id`, `entry_type`, `content JSONB` |
| GROW-05 | DLI Calculator: `DLI = PPFD × LightHours × 0.0036`, manual PPFD input + preset dropdown |
| GROW-06 | LogEntryModal with dynamic forms per entry_type (watering/feeding/note/photo/ph_ec/dli) |
| GROW-07 | Server Actions: `createGrow`, `addPlantToGrow` (trigger fires on >3), `updatePlantStatus`, `addGrowLogEntry` |
| GROW-08 | `grow_comments` flat table (no nesting), all authenticated users can read/write |
| GROW-09 | `grow_follows` table (user follows grow, not plant) |
| GROW-10 | `/grows/explore` public feed page with timeline UI (separate from Strain Discover) |
| GROW-11 | `/grows/explore/[id]` public grow detail with flat comments |
| GROW-12 | Compliance disclaimer visible on all public grow feeds |
| GROW-13 | KCanG § 9 warning UI when user attempts 4th plant |
| GROW-14 | next/og Harvest Certificate route `/api/grows/[id]/harvest-report` |
| GROW-15 | Grow privacy toggle (is_public) in grow detail UI |

### Success Criteria

1. DB trigger rejects 4th active plant with "KCanG Compliance Error: Max 3 active plants"
2. DLI Calculator shows correct DLI value for any PPFD × hours input
3. `/grows/explore` shows public grows with timeline + comments
4. All public feeds display: "Wissensaustausch für den legalen Eigenanbau nach KCanG..."
5. Harvest Certificate renders sober botanical report image (no emojis, no promotional text)
6. Server Actions use `requesting_user_id()` for Clerk JWT RLS compatibility

---

## Out of Scope

| Item | Reason |
|------|--------|
| User Migration (existing Supabase users) | No migration — Supabase auth stays for existing users |
| Clerk Webhooks for Supabase Profile Sync | Deferred post-Phase 04 |
| Apple/Microsoft/GitHub OAuth | Only Google in scope for Phase 04 |
| SSO / SAML (Enterprise) | Out of scope for MVP |
| ~~Grows/Eigenanbau-Tracker~~ | ✅ **Legal clarified — Phase 6 implements** |
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
| OMA-03, OMA-04 | Phase 3 | Done (03-03, 03-04) |
| TRC-01 — TRC-06 | Phase 5 | Done (05-01) |
| GROW-01 — GROW-15 | Phase 6 | Planned |

**Overall v1 coverage:** 14/14 requirements mapped + 4 OMA + 15 GROW
**Phase 6 coverage:** 15/15 GROW requirements planned

### Phase 7: Grow-UI-Integration: Toggle-Switch in Collection (Meine Sorten/Meine Grows), Quick-Access Widget on Home Dashboard, Toggle-Switch in Social (Community Feed/Public Grows)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 6
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 7 to break down)

---

## Phase 5: Terpene Radar Chart

**Goal:** Interactive SVG radar/spider chart for terpene profiles, embedded in the strain detail page (flip card back side) and optionally on the strain compare page.

### Requirements (TRC-01 — TRC-06)

| ID | Requirement |
|----|-------------|
| TRC-01 | New `TerpeneRadarChart` component — pure SVG, no chart library |
| TRC-02 | Parse terpene names + optional percent values from `terpenes?: (string \| Terpene)[]` |
| TRC-03 | Max 6 terpenes displayed (slice + alphabetical sort) |
| TRC-04 | Missing percent values → equal distribution (all axes at 70%) |
| TRC-05 | Integration in StrainDetailPageClient back side (flip card) |
| TRC-06 | Optional: Integration in strain-compare-card (size={140}) |

### Success Criteria

1. `TerpeneRadarChart` component renders in `src/components/strains/`
2. Radar chart shows on strain detail back side when `≥3` terpenes present
3. Fallback to text chips when `<3` terpenes
4. No terpenes → Terpene section hidden entirely
5. Theme color correctly applied (Indica/Sativa/Hybrid)
6. Mobile view: chart scales correctly within card at 375px width
7. Compare page: chart renders at smaller size (140px)

### Technical Approach

- **Pure SVG** — no Recharts/Chart.js dependency (~80 lines)
- **Algorithm:** N-point polygon, angle per axis = 360°/N, axes labeled with terpene names
- **Grid:** 3 concentric polygons at 33%, 66%, 100%
- **Fill:** themeColor at 20% opacity, stroke at 100%
- **Animation:** CSS scale transform from 0 on mount
- **Fallback:** Text chips when < 3 terpenes
