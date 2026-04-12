# MASTER SPECIFICATION: GreenLog / CannaLog Grow-Diary & Community

## 1. Architectural & Compliance Context

- **Stack:** Next.js 15.5 (App Router), React 19, Tailwind CSS v4, Radix UI
- **Backend/DB:** Supabase (PostgreSQL)
- **Auth:** Clerk (JWT/RLS via `requesting_user_id()`)
- **RLS:** Custom `requesting_user_id()` function for Clerk JWT compatibility — NEVER use `auth.uid()`
- **Data Fetching:** React Query / fetch for GET. React Server Actions for mutations.
- **KCanG Compliance:** Max 3 active plants per user across ALL grows. Hard-limit enforced by DB trigger.

---

## 2. Module A: Private Grow-Diary

### 2.1 Database Schema

**`plants`** table (NEW):
- `id` (UUID, PK), `grow_id` (UUID, FK→grows), `user_id` (TEXT, Clerk),
  `strain_id` (UUID, FK→strains, NULLABLE), `plant_name` (TEXT),
  `status` (ENUM: seedling, vegetative, flowering, flushing, harvested, destroyed),
  `planted_at` (TIMESTAMPTZ), `harvested_at` (TIMESTAMPTZ, NULLABLE)

**`grow_milestones`** table (NEW):
- `id` (UUID, PK), `grow_id` (UUID, FK), `phase` (ENUM: germination, vegetation, flower, flush, harvest),
  `started_at` (TIMESTAMPTZ), `ended_at` (TIMESTAMPTZ), `notes` (TEXT)

**`grow_presets`** table (NEW):
- `id` (UUID, PK), `name` (TEXT), `grow_mode` (ENUM: autoflower, photoperiod),
  `light_cycle` (TEXT, e.g. '18/6', '12/12'), `estimated_veg_days` (INT), `estimated_flower_days` (INT),
  `ppfd_value` (INT), `is_public` (BOOL), `created_by` (TEXT)

**`grow_entries`** — extend existing table:
- Add: `plant_id` (UUID, FK→plants), `entry_type` (ENUM: watering, feeding, note, photo, ph_ec, dli, milestone),
  `content` (JSONB), `entry_date` (DATE)

### 2.2 KCanG 3-Plant Limit Trigger

PL/pgSQL trigger on `plants` BEFORE INSERT OR UPDATE:
- Count only active statuses: `seedling`, `vegetative`, `flowering`, `flushing`
- If count >= 3 → `RAISE EXCEPTION 'KCanG Compliance Error: Max 3 active plants allowed per user (§ 9 KCanG).'`
- `harvested` and `destroyed` plants do NOT count

### 2.3 DLI Calculator

Formula: `DLI = PPFD × LightHours × 0.0036`

UI: Number input for PPFD (umol/m²/s) + dropdown for quick presets:
- "LED 300W Budget" → PPFD 400
- "LED 600W Profi" → PPFD 700
- "Sonniges Outdoor" → PPFD 800
- "CFL Low Heat" → PPFD 300
- "Autoflower Standard" → PPFD 500
- "Photoperiod Indoor" → PPFD 700
- "Manuell" → empty input

Preset selection auto-fills the PPFD field. Users can override with manual input.

### 2.4 Server Actions (Module A)

- `createGrow(data: {title, strainId?, growType, startDate})` → creates grow, returns growId
- `addPlantToGrow(growId, data: {plantName, strainId?})` → adds plant (DB trigger fires on >3)
- `updatePlantStatus(plantId, newStatus)` → updates plant phase
- `addGrowLogEntry(plantId, entryType, contentJson)` → adds log entry

---

## 3. Module B: Grow-Community

### 3.1 Database Schema

**`grow_comments`** table (NEW, FLAT — no nesting):
- `id` (UUID, PK), `grow_entry_id` (UUID, FK), `user_id` (TEXT), `comment` (TEXT)
- NO `parent_id` column — flat structure only
- All authenticated users can read; owner can create/delete own

**`grow_follows`** table (NEW):
- `id` (UUID, PK), `user_id` (TEXT), `grow_id` (UUID, FK), `created_at` (TIMESTAMPTZ)
- UNIQUE(user_id, grow_id) — one follow per user per grow
- User follows the entire grow project (not individual plants)

### 3.2 Public Feed

Page: `/grows/explore` — separate from `/discover` (Strain-Katalog)

Feed shows:
- Public grows with timeline (chronological grow_entries)
- Each entry shows: date, type, content (JSONB rendered by type)
- Flat comment section per entry
- Compliance disclaimer at top: "Wissensaustausch für den legalen Eigenanbau nach KCanG. Der Handel oder die Weitergabe von privat angebautem Cannabis an Dritte ist gesetzlich verboten (§ 9 Abs. 2 KCanG)."

### 3.3 Compliance Disclaimer

Fixed text (German, sober):
> "Wissensaustausch für den legalen Eigenanbau nach KCanG. Der Handel oder die Weitergabe von privat angebautem Cannabis an Dritte ist gesetzlich verboten (§ 9 Abs. 2 KCanG)."

Displayed at:
- Top of `/grows/explore`
- Top of `/grows/explore/[id]`
- Below every public grow entry

---

## 4. Module C: Harvest Certificate

### 4.1 next/og Route

`GET /api/grows/[id]/harvest-report`

Generates a server-side OG image using `next/og`:
- Size: 1200×630px
- Background: white/off-white
- Content: Strain name, grow duration, light cycle, harvest date
- NO emojis, NO promotional text ("Massive Yield!", "Insane Results!")
- Style: Sober botanical document / botanical growth report
- Font: System sans-serif

### 4.2 Trigger UI

Button in completed grow detail: "Ernte-Bericht exportieren"
- On click: opens/fetches the OG image URL
- Displayed in a share dialog

---

## 5. Frontend Pages & Components

### Pages:
- `/grows` — Own grows dashboard
- `/grows/new` — Create new grow form
- `/grows/[id]` — Private grow detail with timeline + plant tracker
- `/grows/explore` — Public community feed (NEW)
- `/grows/explore/[id]` — Public grow detail with comments (NEW)

### Key Components (`/components/grows/`):
- `GrowCard.tsx` — Grow project overview card
- `GrowTimeline.tsx` — Chronological grow_entries renderer
- `PlantTracker.tsx` — Individual plant with phase indicator
- `PhaseBadge.tsx` — Phase badge (germination/vegetation/flower/flush/harvest)
- `DLICalculator.tsx` — PPFD input + preset dropdown + DLI formula
- `LogEntryModal.tsx` — Dynamic form: type selector → fields based on entry_type
- `GrowCommentsList.tsx` — Flat comments list
- `GrowCommentForm.tsx` — Comment input form
- `HarvestCertificateExport.tsx` — Triggers next/og export
- `PlantLimitWarning.tsx` — "Gesetzl. Limit erreicht" error display
- `GrowPrivacyToggle.tsx` — is_public toggle

---

## 6. API Routes

- `POST /api/grows` — Create grow (Server Action `createGrow`)
- `GET /api/grows/explore` — Public grows feed
- `GET /api/grows/[id]` — Grow detail (owner or public)
- `PATCH /api/grows/[id]` — Update grow (title, is_public)
- `POST /api/grows/[id]/plants` — Add plant (Server Action `addPlantToGrow`)
- `PATCH /api/grows/[id]/plants/[plantId]` — Update plant status
- `DELETE /api/grows/[id]/plants/[plantId]` — Mark harvested
- `POST /api/plants/[id]/entries` — Add log entry
- `GET /api/grow-entries/[id]/comments` — Get comments
- `POST /api/grow-entries/[id]/comments` — Add comment
- `POST /api/grow-follows` — Follow a public grow
- `DELETE /api/grow-follows/[growId]` — Unfollow
- `GET /api/grows/[id]/harvest-report` — next/og image generation

---

## 7. RLS Policies (all use `requesting_user_id()`)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| plants | owner OR public grow | owner | owner | owner |
| grow_milestones | owner OR public grow | owner | owner | owner |
| grow_entries | owner OR public grow | owner | owner | owner |
| grow_comments | authenticated | owner | owner | owner |
| grow_follows | owner | authenticated | — | owner |
| grow_presets | public OR creator | authenticated | creator | creator |

---

## 8. Constraints

- Clerk `user_id` is TEXT (e.g., `user_2ABC...`), NOT UUID
- All `user_id` columns in new tables use TEXT
- All RLS policies use `requesting_user_id()` — never `auth.uid()`
- 3-plant limit is a DB trigger, not application logic
- Comments are FLAT (no nesting, no parent_id)
- grow_follows references `grow_id`, not `plant_id`
