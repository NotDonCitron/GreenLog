# Phase 6: Grow-Diary & Community - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning
**Source:** PRD Express Path (.planning/PRD-grow-diary-module-abc.md)

<domain>
## Phase Boundary

Module A (Private Grow-Diary) + Module B (Public Grow-Community) + Module C (Harvest Certificate Export).
KCanG § 9 compliant — max 3 active plants per user enforced by DB trigger on `plants` table.

</domain>

<decisions>
## Implementation Decisions

### Database
- `plants` table: NEW, with plant_status enum + 3-plant LIMIT trigger
- `grow_milestones` table: NEW
- `grow_presets` table: NEW with 6 seeded presets
- `grow_entries`: extend with plant_id, entry_type, content (JSONB)
- `grow_comments`: NEW, FLAT (no parent_id), no nesting
- `grow_follows`: NEW, follows grow_id (not plant_id)
- All user_id columns: TEXT (Clerk IDs, not UUID)
- All RLS: use requesting_user_id() — NEVER auth.uid()

### KCanG Compliance
- DB trigger: counts only seedling+vegetative+flowering+flushing
- harvested/destroyed do NOT count
- Trigger RAISEs exception with German law citation

### DLI Calculator
- Formula: DLI = PPFD × LightHours × 0.0036
- PPFD input: number field + preset dropdown (auto-fills PPFD)
- 6 presets: LED 300W (400), LED 600W (700), Outdoor Sun (800), CFL (300), Auto (500), Photo (700)

### Server Actions
- createGrow, addPlantToGrow (trigger fires on >3), updatePlantStatus, addGrowLogEntry
- All use requesting_user_id() for Clerk JWT RLS

### Community
- /grows/explore separate from /discover
- Flat comments only (no nesting)
- grow_follows: user follows grow (not plant)
- Compliance disclaimer on all public feeds

### Harvest Certificate
- next/og server-side at GET /api/grows/[id]/harvest-report
- Sober botanical report (no emojis, no promotional text)
- 1200×630px OG image

### Frontend
- App Router (Next.js 15.5), no Pages Router
- Server Actions for mutations
- React Query for data fetching
- Components in /components/grows/

### Claude's Discretion
- Specific component file structure (exact names TBD)
- CSS styling approach (use existing Tailwind v4 patterns)
- Animation choices for timeline entries
- Error boundary approach for DB trigger errors
- Demo mode handling for grow features

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `CLAUDE.md` — Stack: Next.js 15.5 App Router, Clerk Auth, Supabase, Tailwind v4
- `.planning/PRD-grow-diary-module-abc.md` — Full PRD with all requirements

### Existing Patterns
- `src/app/api/organizations/[id]/route.ts` — API route pattern with jsonSuccess/jsonError
- `src/components/auth-provider.tsx` — Auth context pattern
- `src/lib/types.ts` — TypeScript interfaces pattern
- `supabase-schema.sql` — Existing schema, grows + grow_entries tables already exist

### SQL Migration (ALREADY WRITTEN)
- `supabase/migrations/20260412000000_grow_diary_module_abc.sql` — Already committed

</canonical_refs>

<specifics>
## Specific Ideas

### plants table constraint
- CHECK on status column: seedling, vegetative, flowering, flushing, harvested, destroyed
- FK: grow_id → grows(id), user_id → profiles(id), strain_id → strains(id) NULLABLE

### grow_presets seed data
1. Autoflower Standard — autoflower, 18/6, 14 veg, 49 flower, ppfd 500
2. Photoperiod Indoor — photoperiod, 18/6, 42 veg, 63 flower, ppfd 700
3. Sonniges Outdoor — photoperiod, sun, 60 veg, 90 flower, ppfd 800
4. LED 300W Budget — photoperiod, 18/6, 30 veg, 56 flower, ppfd 400
5. LED 600W Profi — photoperiod, 18/6, 35 veg, 63 flower, ppfd 700
6. CFL Low Heat — photoperiod, 18/6, 28 veg, 49 flower, ppfd 300

### Compliance Disclaimer (German, exact text)
"Wissensaustausch für den legalen Eigenanbau nach KCanG. Der Handel oder die Weitergabe von privat angebautem Cannabis an Dritte ist gesetzlich verboten (§ 9 Abs. 2 KCanG)."

### KCanG Trigger Error Message
"KCanG Compliance Error: Max 3 active plants allowed per user (§ 9 KCanG)."

### JSONB content structure per entry_type
- watering: { amount_liters: number }
- feeding: { nutrient: string, amount: string, ec?: number }
- note: { note_text: string }
- photo: { photo_url: string, caption?: string }
- ph_ec: { ph: number, ec: number }
- dli: { ppfd: number, light_hours: number, dli: number }
- milestone: { milestone_phase: string, notes?: string }

</specifics>

<deferred>
## Deferred Ideas

- Real-time WebSocket for grow notifications (not in scope)
- Grow analytics dashboard (future phase)
- Export grow data as PDF (beyond OG image)

</deferred>

---

*Phase: 06-grow-diary-community-module-a-b-c*
*Context gathered: 2026-04-12 via PRD Express Path*
