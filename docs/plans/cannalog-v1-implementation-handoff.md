# CannaLOG V1 CSC Updates - Implementation Handoff

**Last updated:** 2026-04-26
**Strategy doc:** `GreenLog/conductor/tracks/social-media-setup/cannalog_v1_csc_feed_strategy.md`
**Plan doc:** `GreenLog/docs/plans/csc-updates-no-chat-no-comments.md`

---

## Hard V1 Boundaries (non-negotiable)

- No global public feed
- No chat, DMs, comments, or reply threads
- No price/inventory/pickup/delivery/contact-broker fields
- No private/club-only/draft/review-pending data in public surfaces
- CSC updates are admin-only (gründer/admin) until moderation exists

## What's Done

### Phase 1 - Visibility Boundary ✅
- Removed `/collection`, `/profile` from public sitemap
- `/api/communities/[id]/feed` requires authentication + active membership
- Public strain catalog filters to `publication_status = 'published'`
- Sitemap tests updated

### Phase 4 - CSC Update Data Shape ✅
- **Migration pushed to Supabase:** `supabase/migrations/20260426190000_club_update_posts.sql`
- **Table:** `public.club_update_posts`
  - `author_id TEXT` (not UUID - matches `profiles.id` which is TEXT)
  - `organization_id UUID`, FK to organizations
  - `post_type` enum: announcement, event, compliance_notice, documentation_note, strain_info, club_info, system_notice, poll_notice
  - `visibility` locked to `club_only` via CHECK constraint
  - `moderation_status`: active | hidden | removed (V1 only, no pending_review/flagged yet)
  - `hidden_at/hidden_by`, `removed_at/removed_by` for soft-remove audit trail
  - Title: 3-160 chars, Body: 1-5000 chars, metadata JSONB
- **RLS policies:**
  - SELECT: only gründer/admin of the org can read
  - INSERT: only gründer/admin, author_id must = requesting_user_id(), visibility must = club_only
  - UPDATE: only gründer/admin, visibility must stay club_only
  - No DELETE policy (soft-remove only via UPDATE)
- **TypeScript types** added to `src/lib/types.ts`:
  - `ClubUpdatePostType`, `ClubUpdateVisibility`, `ClubUpdateModerationStatus`
  - `ClubUpdatePost`, `ClubUpdatePostCreateInput`, `ClubUpdatePostUpdateInput`
  - organization_id comes from route param, NOT request body
- **API routes:**
  - `GET /api/communities/[id]/updates` - list active posts (admin-only)
  - `POST /api/communities/[id]/updates` - create post (admin-only, validation enforced)
  - `PATCH /api/communities/[id]/updates/[updateId]` - update/hide post
  - `DELETE /api/communities/[id]/updates/[updateId]` - soft-remove (sets moderation_status='removed')
- **Content validation** (inline in routes, not separate lib):
  - Rejects: EUR/€ prices, inventory language, delivery/pickup, WhatsApp/Telegram, phone numbers, medical cure claims, minor-directed language
  - Returns 422 with clear error message
- **Tests:** `tests/unit/club-updates-route.test.ts` (21 tests, all passing)
  - 401 unauthenticated, 403 non-member, 403 member (not admin)
  - 200 for gründer/admin read
  - 422 for prohibited content (price, WhatsApp, delivery, medical)
  - 400 for invalid post_type, too-short title
  - 201 for valid creation, soft-remove, hide post
- **Schema dump** updated: `supabase-schema.sql` includes club_update_posts

### Phase 5 (partial) - Safety Guards ✅
- Server-side validation built directly into POST/PATCH routes (see above)
- Not extracted to a separate `src/lib/validators/` file yet (can be done later)

### Phase 6 - Disable Comment/Reply Surfaces ✅
- **DB layer:** Migration `20260426090000_disable_grow_comments_for_closed_beta.sql` already locked all RLS policies to `USING(false)` / `WITH CHECK(false)` on `grow_comments`
- **API layer:** `src/app/api/grows/[id]/comments/route.ts` returns 410 GONE for GET/POST/DELETE
- **Tests:** `tests/unit/grow-comments-route.test.ts` already covers 410 responses + no DB access
- **UI cleanup done:**
  - Removed `GrowComment` import and `comments` prop from `timeline-entry.tsx`
  - Removed comment grouping logic from `timeline-section.tsx` (groupByDay no longer takes comments param)
  - Removed `initialComments` prop and `localComments` state from `grow-detail-client.tsx`
  - Removed `comments` variable and `initialComments` prop from `src/app/grows/[id]/page.tsx`
  - Updated test: `src/components/grows/timeline-section.test.tsx` - removed comment test, added "no comment UI controls" test
  - `GrowComment` type still in `src/lib/types.ts` (kept for GDPR delete route table reference, not imported anywhere in src/)

## What's NOT Done

### Phase 7 - Moderation Minimums ✅ (backend + minimal UI path done)
Implemented:
- Migration: `supabase/migrations/20260426230000_phase7_moderation_minimums.sql`
  - `content_reports`, `user_reports`, `user_blocks`, `club_mutes`, `moderation_actions`, `community_rules_acceptances`
  - RLS policies for member report insert, admin moderation reads/updates, and self-visibility where needed
- Shared moderation helper: `src/lib/moderation.ts`
  - org membership/admin checks
  - block/mute restriction checks
  - rate limits (10 posts/hour, 15 reports/hour combined)
  - moderation audit logging helper
- CSC updates + feed routes now enforce moderation restrictions and log moderation actions
- New report APIs:
  - `GET/POST/PATCH /api/communities/[id]/reports/content`
  - `GET/POST/PATCH /api/communities/[id]/reports/user`
- New moderation APIs:
  - `GET/POST/DELETE /api/communities/[id]/moderation/mutes`
  - `GET/POST/DELETE /api/communities/[id]/moderation/blocks`
- Minimal member report UI path in community feed cards:
  - report action posts to `/api/communities/[id]/reports/content`

Remaining follow-up (optional hardening, not blocking this phase handoff):
- admin moderation queue UI for report triage actions (currently API-first)
- DB-level hardening of legacy `community_feed` SELECT RLS (currently route-level auth + membership enforced)

Additional follow-up completed after initial handoff:
- Added an in-community admin moderation surface (reports/mutes/blocks actions) at:
  - `src/components/community/moderation-panel.tsx`
  - mounted in `src/app/community/[id]/page.tsx` for admin/gründer members

### Phase 8 - Rename UI Language (core surfaces) ✅
Implemented in core V1 feed/community surfaces:
- "Social" → "CSC-Updates" in `/feed`
- "Community Feed" language → "Club-Info" in `/community` metadata and community feed empty/error states
- "Following"/"Discover" tab labels made secondary on `/feed` ("Club-Info", "Netzwerk")
- Empty states updated to club-context wording (no social-network wording in touched core surfaces)

Updated files:
- `src/app/feed/page.tsx`
- `src/components/social/activity-feed.tsx`
- `src/app/community/page.tsx`
- `src/app/community/CommunityPageClient.tsx`
- `src/components/community/feed.tsx`

Remaining optional rename sweep (not required for this core phase):
- marketing/demo/preview texts
- broader profile/onboarding language not in the V1 feed/community core route surface

Additional rename sweep completed:
- `src/app/community/[id]/page.tsx` section title changed from generic activity wording to `Club-Info`
- `src/components/marketing/safe-screenshot.tsx` marketing bottom-nav label changed from `Social` to `Club-Info`
- `src/components/onboarding/onboarding-guide.tsx` onboarding step renamed to `Community & Club-Info`

## Key Technical Facts for Continuation

### profiles.id is TEXT (not UUID)
The Clerk auth system uses TEXT IDs. `organization_members.user_id` is TEXT. New tables should use TEXT for user references. The `community_feed.user_id UUID` is an old inconsistency - don't follow it.

### Supabase Helper Functions Available
- `requesting_user_id()` - returns TEXT, used in RLS policies
- `is_org_member(p_organization_id UUID)` - returns BOOLEAN, SECURITY DEFINER
- `current_user_org_role(p_organization_id UUID)` - returns TEXT
- `can_manage_org(p_organization_id UUID)` - returns BOOLEAN (checks owner/admin)

### Auth Pattern for API Routes
```typescript
const auth = await authenticateRequest(request, getAuthenticatedClient);
if (auth instanceof Response) return auth; // 401
const { user, supabase } = auth;
// Then check organization_members for role + active status
```

### Roles
```typescript
USER_ROLES = {
  GRUENDER: "gründer",    // owner
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
  STAFF: "staff",
  PRAEVENTIONSBEAUFTRAGTER: "präventionsbeauftragter", // prevention officer
}
```

### Pre-existing Issues (not caused by this work)
- 1 test failure: `tests/unit/compliance-readiness.test.ts` - age cookie middleware test (unrelated)
- Many lint warnings across codebase (pre-existing)
- `community_feed` RLS still has `USING(true)` on SELECT (was public-read, now gated by API route, but should be hardened at DB level too)

### Build Verification
```bash
npx eslint src/lib/moderation.ts src/app/api/communities/[id]/moderation/blocks/route.ts src/app/api/communities/[id]/reports/content/route.ts src/app/api/communities/[id]/reports/user/route.ts src/components/community/feed.tsx tests/unit/community-moderation-routes.test.ts tests/unit/club-updates-route.test.ts
# passes; only existing no-img warnings in community/feed.tsx

npx tsc --noEmit --incremental false
# fails due many pre-existing type errors in test files (unchanged by this slice)

npm run test
# 231/232 pass; 1 pre-existing failure remains:
# tests/unit/compliance-readiness.test.ts -> age cookie middleware expectation

npm run build
# blocked in this environment: EROFS writing .next/trace
```

### Migration Push
```bash
supabase db push    # pushes new migrations to remote
# Phase 4 migration already pushed successfully
```

## File Map (all changes from this session)

| File | Action | Phase |
|------|--------|-------|
| `supabase/migrations/20260426190000_club_update_posts.sql` | Created | 4 |
| `src/lib/types.ts` | Modified (added ClubUpdate* types) | 4 |
| `src/app/api/communities/[id]/updates/route.ts` | Created | 4 |
| `src/app/api/communities/[id]/updates/[updateId]/route.ts` | Created | 4 |
| `tests/unit/club-updates-route.test.ts` | Created | 4 |
| `supabase-schema.sql` | Modified (added club_update_posts) | 4 |
| `src/components/grows/timeline-entry.tsx` | Modified (removed comments prop) | 6 |
| `src/components/grows/timeline-section.tsx` | Modified (removed comments logic) | 6 |
| `src/components/grows/grow-detail-client.tsx` | Modified (removed comments state) | 6 |
| `src/app/grows/[id]/page.tsx` | Modified (removed comments variable) | 6 |
| `src/components/grows/timeline-section.test.tsx` | Modified (updated for no-comments) | 6 |
| `src/app/feed/page.tsx` | Modified (CSC-Updates/Club-Info language) | 8 |
| `src/components/social/activity-feed.tsx` | Modified (empty-state language) | 8 |
| `src/app/community/page.tsx` | Modified (metadata to Club-Info) | 8 |
| `src/app/community/CommunityPageClient.tsx` | Modified (Club-Info surface labels) | 8 |
| `src/components/community/feed.tsx` | Modified (community feed wording) | 8 |
| `supabase/migrations/20260426230000_phase7_moderation_minimums.sql` | Created | 7 |
| `src/lib/moderation.ts` | Created | 7 |
| `src/app/api/communities/[id]/reports/content/route.ts` | Created | 7 |
| `src/app/api/communities/[id]/reports/user/route.ts` | Created | 7 |
| `src/app/api/communities/[id]/moderation/mutes/route.ts` | Created | 7 |
| `src/app/api/communities/[id]/moderation/blocks/route.ts` | Created | 7 |
| `tests/unit/community-moderation-routes.test.ts` | Created | 7 |
| `tests/unit/community-feed-route.test.ts` | Modified (added new moderation-table mocks) | 7 |
| `tests/unit/club-updates-route.test.ts` | Modified (query mock now includes `gte`) | 7 |
| `src/components/community/moderation-panel.tsx` | Created | 7 |
| `src/app/community/[id]/page.tsx` | Modified (moderation panel mount + Club-Info heading) | 7/8 |
| `src/components/marketing/safe-screenshot.tsx` | Modified (Social → Club-Info in marketing nav) | 8 |
| `src/components/onboarding/onboarding-guide.tsx` | Modified (Community & Social → Community & Club-Info) | 8 |
