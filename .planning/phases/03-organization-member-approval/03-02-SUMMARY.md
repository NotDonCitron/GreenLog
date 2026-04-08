---
phase: 03-organization-member-approval
plan: "02"
subsystem: api
tags:
  - organization
  - membership
  - approval-workflow
  - backend
dependency_graph:
  requires: []
  provides:
    - "src/app/api/organizations/[organizationId]/membership-request/route.ts"
    - "src/app/api/organizations/[organizationId]/members/[memberId]/approve/route.ts"
    - "src/app/api/organizations/[organizationId]/members/[memberId]/reject/route.ts"
  affects:
    - "src/lib/organization-activities.ts"
    - "src/lib/roles.ts"
tech_stack:
  added:
    - "Next.js API Routes (Pages Router)"
    - "Supabase authentication via authenticateRequest helper"
    - "Activity logging via writeOrganizationActivity"
  patterns:
    - "RESTful API routes: POST /membership-request, PATCH /approve, PATCH /reject"
    - "Bearer token authentication"
    - "jsonSuccess/jsonError response helpers"
    - "Admin role checks via USER_ROLES.GRUENDER and USER_ROLES.ADMIN"
key_files:
  - created:
      - "src/app/api/organizations/[organizationId]/membership-request/route.ts"
      - "src/app/api/organizations/[organizationId]/members/[memberId]/approve/route.ts"
      - "src/app/api/organizations/[organizationId]/members/[memberId]/reject/route.ts"
decisions:
  - "membership-request: uses requires_member_approval flag from organizations table to determine if membership is pending or active"
  - "membership-request: returns 409 for existing active memberships, 400 for pending requests"
  - "approve: requires membership_status = 'pending' before approval, else returns 400"
  - "reject: rejection_reason is optional and stored in membership record"
  - "activity: approve writes member_joined, reject writes member_removed"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-08"
---

# Phase 03 Plan 02: Membership Approval API Summary

Three API routes created for the organization membership approval workflow.

## One-liner

Membership request, approve, and reject endpoints enabling pending membership workflow with admin role checks and activity logging.

## Tasks Completed

| Task | Name | Commit |
|------|------|--------|
| 1 | Create membership-request POST endpoint | 3168db6 |
| 2 | Create approve PATCH endpoint | 9e67a25 |
| 3 | Create reject PATCH endpoint | dafde3c |

## Endpoints Implemented

### POST /api/organizations/[organizationId]/membership-request

Authenticated users request to join an organization.

**Logic:**
- Fetches org to check `requires_member_approval` flag
- Checks for existing memberships (active/pending/invited/removed)
- Creates membership as `pending` if approval required, `active` otherwise
- Returns `{ membership, requires_approval }` with 201 status

**Response codes:** 201 (created), 400 (pending/invited/removed), 404 (org not found), 409 (already active member)

### PATCH /api/organizations/[organizationId]/members/[memberId]/approve

Admins/gruender approve pending membership requests.

**Logic:**
- Validates admin role
- Fetches target membership, verifies status is `pending`
- Updates status to `active` and sets `joined_at`
- Writes `member_joined` activity

**Response codes:** 200 (success), 400 (not pending), 403 (not admin), 404 (member not found)

### PATCH /api/organizations/[organizationId]/members/[memberId]/reject

Admins/gruender reject pending membership requests.

**Logic:**
- Validates admin role
- Fetches target membership, verifies status is `pending`
- Parses optional `{ reason?: string }` from body
- Updates status to `rejected` and stores `rejection_reason`
- Writes `member_removed` activity

**Response codes:** 200 (success), 400 (not pending), 403 (not admin), 404 (member not found)

## Verification

Build passes: `npm run build` completes without errors.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None - no new trust boundaries introduced.

---

## Self-Check: PASSED

- All three route files created
- Build passes without errors
- Commits verified in git history
