---
phase: "03-organization-member-approval"
plan: "03"
subsystem: "organization-settings"
tags: ["organization", "member-approval", "settings", "ui-toggle"]
dependency_graph:
  requires: []
  provides: ["OMA-01", "OMA-03"]
  affects: ["src/app/settings/organization/page.tsx", "src/app/api/organizations/[organizationId]/route.ts"]
tech_stack:
  added:
    - "@base-ui/react Switch component (src/components/ui/switch.tsx)"
  patterns:
    - "shadcn/ui CVA pattern for component variants"
    - "PATCH endpoint pattern for settings updates"
    - "Toggle UI with optimistic state update"
key_files:
  created:
    - "src/components/ui/switch.tsx"
  modified:
    - "src/app/api/organizations/[organizationId]/route.ts"
    - "src/app/settings/organization/page.tsx"
decisions:
  - "Switch uses @base-ui/react (not @radix-ui/switch) matching the project's shadcn/ui pattern with CVA"
  - "Both admin and gründer roles can toggle requires_member_approval (not restricted to gründer only)"
  - "Toggle placed between Admins and Aktivitäten sections in settings page"
metrics:
  duration: ""
  completed: "2026-04-08"
---

# Phase 03 Plan 03: Member Approval Toggle Summary

## One-liner

Added UI toggle in organization settings to enable/disable manual member approval with persisted backend.

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend PATCH endpoint to accept requires_member_approval | `010b5f2` | `src/app/api/organizations/[organizationId]/route.ts` |
| 2 | Add toggle to organization settings page | `e4bde38` | `src/components/ui/switch.tsx`, `src/app/settings/organization/page.tsx` |

## What Was Built

### Task 1: PATCH Endpoint Extension
Extended the organization PATCH route handler to accept `requires_member_approval` boolean in the request body. The field is added to the updates object when its value is a boolean. Both `admin` and `gründer` roles can toggle this setting.

### Task 2: Settings Toggle UI
- Created new `Switch` component (`src/components/ui/switch.tsx`) using `@base-ui/react` with the project's CVA pattern
- Added `requiresApproval` state initialized from `activeOrganization.organizations?.requires_member_approval ?? false`
- Added `handleToggleApproval` async handler that PATCHes `/api/organizations/[id]` with `{ requires_member_approval: checked }`
- Added new Card section between "Admins verwalten" and "Aktivitäten" with `UserCheck` icon and the Switch toggle
- Toggle disabled in demo mode with explanatory text

## Verification

- `npm run build` passed successfully
- All routes compiled including `/settings/organization`

## Deviations from Plan

- Created new `Switch` component (plan referenced shadcn pattern but component did not exist in project)

## Known Stubs

None.

## Threat Flags

None.
