# Plan: Adding 'präventionsbeauftragter' Role

Adding the `präventionsbeauftragter` role as a B2B differentiator for Cannabis Social Clubs (CSCs) compliance in Germany (KCanG § 23 Abs. 4).

## Objective
Implement the `präventionsbeauftragter` role across the entire stack (Database, Types, API, and UI) to ensure consistency and legal compliance for B2B customers.

## Key Files & Context
- **Database:** `organization_members` and `organization_invites` tables in Supabase.
- **Types:** `src/lib/types.ts` (`OrganizationMembership`, `OrganizationInvite`).
- **Constants:** `src/lib/roles.ts` (already contains the role, but used for reference).
- **API:** `src/app/api/organizations/[organizationId]/invites/route.ts`.
- **UI Components:**
  - `src/components/organization-switcher.tsx`
  - `src/app/settings/organization/invites/page.tsx`
  - `src/components/notifications/pending-invites-modal.tsx`
  - `src/app/invite/[token]/page.tsx`
  - `src/app/feed/page.tsx`

## Implementation Steps

### 1. Database Migration
- Create a new migration file: `supabase/migrations/20260416000000_add_praeventionsbeauftragter_role.sql`.
- SQL content:
  ```sql
  -- Update organization_members role constraint
  ALTER TABLE organization_members 
  DROP CONSTRAINT IF EXISTS organization_members_role_check;
  
  ALTER TABLE organization_members 
  ADD CONSTRAINT organization_members_role_check 
  CHECK (role IN ('gründer', 'admin', 'member', 'viewer', 'präventionsbeauftragter'));

  -- Update organization_invites role constraint
  ALTER TABLE organization_invites 
  DROP CONSTRAINT IF EXISTS organization_invites_role_check;
  
  ALTER TABLE organization_invites 
  ADD CONSTRAINT organization_invites_role_check 
  CHECK (role IN ('admin', 'staff', 'member', 'viewer', 'präventionsbeauftragter'));
  ```
- Update `supabase-schema.sql` to reflect these changes.

### 2. Type Updates
- Update `src/lib/types.ts`:
  - `OrganizationMembership['role']`: Add `'präventionsbeauftragter'`.
  - `OrganizationInvite['role']`: Update to `'admin' | 'staff' | 'member' | 'viewer' | 'präventionsbeauftragter'`.

### 3. API Updates
- Update `src/app/api/organizations/[organizationId]/invites/route.ts`:
  - Update `POST` validation to include `USER_ROLES.PRAEVENTIONSBEAUFTRAGTER` in the allowed roles array.

### 4. UI Display Updates
- **Organization Switcher:** Update `formatRoleLabel` in `src/components/organization-switcher.tsx`.
- **Invites Page:** 
  - Update `formatRoleLabel` and `RoleBadge` in `src/app/settings/organization/invites/page.tsx`.
- **Pending Invites Modal:** Update role display logic in `src/components/notifications/pending-invites-modal.tsx`.
- **Invite Page:** Update role display labels in `src/app/invite/[token]/page.tsx`.
- **Feed Page:** Update role display labels in `src/app/feed/page.tsx`.

### 5. Invite Form Enhancements
- Update `src/app/settings/organization/invites/page.tsx`:
  - Add a role selection UI (e.g., a group of buttons or a dropdown) to allow choosing the role for new invites.
  - Default to `USER_ROLES.MEMBER` or `USER_ROLES.ADMIN` as appropriate.

## Verification & Testing
- **Manual Test:** 
  1. Create a new invite with the role `präventionsbeauftragter`.
  2. Verify the invite is saved correctly in the `organization_invites` table.
  3. Log in as another user and accept the invite.
  4. Verify the role is correctly set to `präventionsbeauftragter` in the `organization_members` table.
  5. Verify the role is displayed correctly in the UI (Switcher, Profile, etc.).
