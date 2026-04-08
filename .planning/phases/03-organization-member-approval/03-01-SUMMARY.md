---
phase: "03-organization-member-approval"
plan: "01"
subsystem: "database-schema"
tags: ["supabase", "rls", "member-approval", "schema"]
dependency_graph:
  requires: []
  provides: ["OMA-01", "OMA-02"]
  affects: ["src/lib/types.ts", "supabase-schema.sql", "supabase/migrations"]
tech_stack:
  added: []
  patterns: ["RLS policy for pending member visibility", "membership_status CHECK constraint"]
key_files:
  created:
    - "supabase/migrations/20260408130000_oma_schema_member_approval.sql"
  modified:
    - "src/lib/types.ts"
    - "supabase-schema.sql"
decisions:
  - "Added requires_member_approval flag to organizations table to toggle manual approval workflow"
  - "Extended membership_status enum with 'pending' value for join requests awaiting approval"
  - "Added rejection_reason column to organization_members for transparency when requests are denied"
  - "Created composite index idx_org_members_status for efficient pending member queries"
  - "RLS policies updated: pending members hidden from regular org members, visible only to admins/gründer"
metrics:
  duration_seconds: 185
  completed_date: "2026-04-08T09:37:50Z"
---

# Phase 03 Plan 01: Organization Member Approval Schema

**One-liner:** Database schema changes supporting optional manual member approval for organizations via requires_member_approval flag and pending membership status.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create migration file for member approval schema | 4b6eedb | supabase/migrations/20260408130000_oma_schema_member_approval.sql |
| 2 | Update types.ts with new membership statuses | 9435349 | src/lib/types.ts |
| 3 | Update supabase-schema.sql with new columns and policies | 87e5e02 | supabase-schema.sql |

## What Was Built

**Database schema changes enabling optional manual member approval:**

1. **organizations.requires_member_approval** (BOOLEAN, DEFAULT false) - Toggle for manual approval workflow
2. **organization_members.membership_status** - Extended with 'pending' value in CHECK constraint
3. **organization_members.rejection_reason** (TEXT) - Optional field for denial transparency
4. **idx_org_members_status** index on (organization_id, membership_status) - Efficient pending queries
5. **RLS policy split** - Regular members see only active members; admins see pending members

## Verification

- Migration file validated for required SQL elements
- `npm run build` passes with no TypeScript errors
- Schema changes reflected consistently in migration, supabase-schema.sql, and types.ts

## Success Criteria Met

- [x] OrganizationMembership type has membership_status including 'pending'
- [x] Organization type has requires_member_approval boolean
- [x] organization_members table has rejection_reason column
- [x] Index idx_org_members_status exists on (organization_id, membership_status)
- [x] RLS policies properly restrict pending member visibility

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

After `supabase db push` is run, organizations can toggle `requires_member_approval = true` and join requests will create pending memberships instead of active ones. Future plans (OMA-03, OMA-04) will implement the approval/rejection UI and API endpoints.

## Self-Check: PASSED

- Migration file exists at correct path
- Types.ts updated with all new fields
- supabase-schema.sql updated consistently
- All 3 commits verified in git log
