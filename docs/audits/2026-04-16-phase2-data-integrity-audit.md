# Phase 2: Data Integrity & Schema Consistency — Audit Report

**Date:** 2026-04-16
**Auditor:** Claude Opus 4.6
**Build:** PASS

---

## Changes Made

### 1. types.ts — Schema ↔ Types Sync
- **Removed** 9 phantom Strain fields: `brand`, `manufacturer`, `irradiation`, `avg_thc`, `avg_cbd`, `cbg`, `cbn`, `thcv`, `genetics`, `indications`, `is_medical`
- **Added** missing fields: `ProfileRow.date_of_birth/full_name`, `RatingRow.is_public`, `Organization.avatar_url/description`, `Grow.*` (medium, light_type, nutrients, yield_grams, created_at, expected_harvest_date, grow_notes), `GrowEntry.*` (organization_id, ec_value, water_temperature, nutrient_dose)
- **Fixed** `Grow.status`: `'archived'` → `'abandoned'` (matches DB CHECK)
- **Fixed** `Grow.organization_id`: optional → required (matches DB NOT NULL)
- **Added** `GrowComment.grow_id` field
- **Added** new interfaces: `CscBatch`, `CscDispensation`, `CscDestruction`, `Notification`, `StrainReport`, `Badge`
- **Kept** `Strain.type` with `'ruderalis'` — DB constraint updated to match

### 2. Broken Code References Fixed
- `admin-list-modal.tsx`: `organization_memberships` → `organization_members` (3 places)
- `useCommunity.ts`: Removed query to non-existent `user_community_order` table
- `GrowComment` type: Added `grow_id` field (column added in migration)

### 3. Migration: `20260416210000_phase2_data_integrity.sql`

**Trigger Fix:**
- `kcang_dispensation_check()`: Changed `SELECT avg_thc` → `SELECT COALESCE((thc_min+thc_max)/2, thc_max, thc_min, 0)` — previous version referenced non-existent column, breaking all CSC dispensations

**CHECK Constraints (16):**
- `strains`: thc_min/max, cbd_min/max range 0-100 + min≤max
- `strains`: type CHECK updated to include `ruderalis`
- `user_collection`: thc/cbd percent 0-100
- `grow_entries`: humidity 0-100, ph 0-14, temp -50..70, height≥0, ec 0-50, water_temp 0-100, nutrient≥0, day≥0
- `grows`: yield_grams ≥ 0
- `follows`: no self-follow
- `follow_requests`: no self-request
- Partial unique: `organization_invites(org_id, email)` WHERE pending

**Indexes (12):**
- `strains(name)`, `strains(org_id, name)` — main listing sort
- GIN on `strains(effects)`, `strains(flavors)` — array filters
- `strains(thc_max)`, `strains(thc_min)` — range filters
- `organization_members(org_id, user_id, status)` — auth check (most repeated query)
- `organization_members(user_id, status)` — user's own orgs
- `notifications(user_id, created_at DESC)` — polling
- `user_activities(user_id, created_at DESC)` — feed
- `follow_requests(target_id, status)` — pending lookups

**FK ON DELETE Fixes (8):**
- `organizations.created_by` → SET NULL
- `strains.created_by` → SET NULL
- `strains.organization_id` → SET NULL
- `organization_members.invited_by` → SET NULL
- `organization_invites.invited_by` → SET NULL
- `strain_reports.reviewed_by` → SET NULL
- CSC tables (batches/dispensations/destructions) `organization_id` → RESTRICT (KCanG § 26 data retention)

**Schema Addition:**
- `grow_comments.grow_id` column + index (code queries by it, column was missing)

### 4. Clerk Remnants Removed
- `@clerk/nextjs` removed from dependencies
- `@clerk/testing` removed from devDependencies
- `src/app/sign-in/sso-callback/` deleted
- CLERK env vars removed from `.env.example`
- 5 test files cleaned of Clerk imports

---

## Known Issues Deferred to Phase 3

| Issue | Reason |
|-------|--------|
| `supabase-schema.sql` stale (missing ~20 tables) | Needs full regeneration from live DB |
| 16 files import from `@/lib/supabase` (old path) | Phase 3 dead code cleanup |
| `requesting_user_id()` vs `auth.uid()` inconsistency | Cross-cutting, needs careful audit |
| `is_active_org_member` UUID vs TEXT overload | Requires checking all call sites |
| `.claude/clerk-*.cjs` debug scripts | Low priority cleanup |
| `CLAUDE.md` still references Clerk as auth | Documentation update |
