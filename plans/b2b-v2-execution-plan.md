# B2B v2.0 Execution Plan

## Goal

Move the current multi-tenancy foundation from partial implementation to a usable B2B workspace model for clubs and pharmacies.

## Current confirmed baseline

- Organization creation works
- Shared-schema multi-tenancy foundation exists
- Core RLS helper functions exist
- Membership loading and active workspace switching exist in the app shell
- Grow creation already depends on an active organization

## Scope for the next implementation block

### 1. Finalize domain classification

Decide for each existing area whether it remains global, personal, or organization-scoped.

- Global
  - strains catalog
  - public discovery data if intentionally public
- Personal
  - profiles identity layer
  - private favorites and collection data unless later needed by organizations
- Organization-scoped
  - grows
  - grow_entries
  - future workspace operations such as inventory and internal workflows
- Explicit product decision required
  - ratings
  - social visibility boundaries
  - custom strains ownership model

## Implementation order

### Phase A: Membership and invite foundation

Deliver a complete organization user-management loop.

- Add API routes for invite creation, membership listing, membership updates, and member removal
- Implement invite acceptance flow against existing organization invite tables
- Support role updates for owner, admin, staff, member with clear restrictions
- Support suspension and removal rules
- Prevent unsafe owner removal and privilege escalation

### Phase B: Database expansion decisions

Only add extra B2B tables if needed after classification is finalized.

Candidate tables:
- organization_settings
- organization_audit_log
- organization_locations
- organization_inventory
- organization_strains

Decision rule:
- Only create tables needed for the first operational B2B workflows
- Keep optional tables out of the first block if they do not unlock immediate use cases

### Phase C: Org-context rollout across features

Expand beyond organization creation and grow creation.

Priority feature paths:
1. grow list
2. grow detail
3. grow entries create and edit
4. organization member management screens
5. invite management screens

Each path must:
- read from the active organization context
- fail safely when no active organization is selected
- rely on RLS instead of UI trust

### Phase D: Security and correctness

- Verify all org-scoped queries filter by workspace or rely on RLS correctly
- Add cross-tenant test scenarios
- Add role-permission test scenarios
- Verify no social or public endpoints leak organization data

## Concrete execution checklist

- [ ] Finalize classification for ratings, social data, and custom strains
- [ ] Add organization membership management API design
- [ ] Add organization invite API design
- [ ] Define exact role-change rules and forbidden transitions
- [ ] Define member suspension and removal rules
- [ ] Decide whether organization_settings is needed in the first block
- [ ] Decide whether inventory and organization_strains are needed now or later
- [ ] Integrate org context into grow list and grow detail flows
- [ ] Integrate org context into grow entry flows
- [ ] Add UI for member list, role changes, and invite handling
- [ ] Add test plan for tenant isolation and role rules

## Recommended first code-mode slice

Start with the smallest end-to-end admin slice:

1. Membership listing API
2. Invite creation API
3. Invite acceptance API
4. Role update API
5. Basic workspace members UI on profile or settings area

This slice unlocks the main missing capability behind separated user management for clubs and pharmacies.

## Handover notes for code mode

Implement in this order:

1. SQL migration adjustments only if needed for invite acceptance or stricter constraints
2. API routes for memberships and invites
3. Frontend member-management UI
4. Grow list and grow detail org-context rollout
5. Security and regression tests

## Done definition for this block

This block is complete when:

- An organization owner or admin can invite users
- A user can accept an invite into a workspace
- Owners and admins can manage members safely
- Workspace-specific grow data is accessible only inside the correct organization
- No existing public or social features leak tenant data
