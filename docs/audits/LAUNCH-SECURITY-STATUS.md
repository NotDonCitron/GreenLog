# Launch Security Status

Date: 2026-04-25

Scope: Re-check of Critical and High findings from `docs/audits/2026-04-16-phase1-security-audit.md`.

## Summary

The public-beta blockers around unauthenticated critical routes, notification spoofing, broad community-feed inserts, and client-bundled admin IDs are fixed in code or in new migrations. Some High findings remain open because they need a live Supabase policy-state verification or a broader validation pass.

## Findings

### C1. `/api/test-notification` unauthenticated service-role access

- Status: fixed
- Betroffene Dateien: `src/app/api/test-notification/route.ts`
- Was geändert wurde: Route is authenticated and admin-gated before service-role reads/writes.
- Noch offenes Risiko: Depends on `APP_ADMIN_IDS` being set correctly in the deployment environment.

### C2. `/api/consumption/[id]` unauthenticated CRUD

- Status: fixed
- Betroffene Dateien: `src/app/api/consumption/[id]/route.ts`
- Was geändert wurde: GET/PATCH/DELETE use `authenticateRequest`; reads and mutations are scoped with `user_id = user.id`.
- Noch offenes Risiko: Additional input range validation can be tightened for optional numeric/log fields.

### C3. `/api/reminders/[id]` unauthenticated PATCH/DELETE

- Status: fixed
- Betroffene Dateien: `src/app/api/reminders/[id]/route.ts`
- Was geändert wurde: PATCH/DELETE use `authenticateRequest` with authenticated Supabase client.
- Noch offenes Risiko: Ownership is primarily enforced through RLS; verify live `grow_reminders` policy state after migrations.

### C4. `notifications` INSERT `WITH CHECK (true)`

- Status: fixed
- Betroffene Dateien: `supabase/migrations/20260416200000_phase1_rls_security_fixes.sql`, `supabase/migrations/20260425120000_launch_rls_hardening.sql`
- Was geändert wurde: The insert policy is dropped and recreated as service-role-only with `WITH CHECK (false)` so clients cannot spoof notifications.
- Noch offenes Risiko: Apply the new migration and inspect live policies in Supabase before public beta.

### C5. `community_feed` INSERT `WITH CHECK (true)`

- Status: fixed
- Betroffene Dateien: `supabase/migrations/20260416200000_phase1_rls_security_fixes.sql`, `supabase/migrations/20260425120000_launch_rls_hardening.sql`
- Was geändert wurde: The insert policy is dropped and recreated as service-role-only with `WITH CHECK (false)`; feed writes should come from trusted triggers/server paths.
- Noch offenes Risiko: Apply the new migration and verify trigger/server write paths in production.

### C6. `NEXT_PUBLIC_APP_ADMIN_IDS` leaks admin UUIDs

- Status: fixed
- Betroffene Dateien: `src/lib/auth.ts`, `src/app/api/admin/me/route.ts`, `src/hooks/useAppAdmin.ts`, admin pages under `src/app/admin/**`, `src/app/profile/profile-view.tsx`, `src/app/strains/[slug]/StrainDetailPageClient.tsx`, `src/app/api/import/leafly/route.ts`
- Was geändert wurde: Server-side admin checks use only `APP_ADMIN_IDS`; client UI calls `/api/admin/me` for a boolean admin result.
- Noch offenes Risiko: Historical docs and old logs may mention the removed public env name; app/source code no longer uses it.

### C7. `auth.uid()` vs `requesting_user_id()` inconsistency

- Status: still open
- Betroffene Dateien: multiple historical files under `supabase/migrations/**`
- Was geändert wurde: New launch hardening migration uses `requesting_user_id()` for the organization policies it changes.
- Noch offenes Risiko: Historical migrations still contain `auth.uid()` policies. A live Supabase policy dump is required to confirm the final applied state after all later migrations.

### H1. `/api/grow-entries` missing auth

- Status: fixed
- Betroffene Dateien: `src/app/api/grow-entries/route.ts`
- Was geändert wurde: POST uses `authenticateRequest` and verifies grow ownership before insert.
- Noch offenes Risiko: Numeric grow-entry ranges are still basic and can be tightened.

### H2. `/api/grows/[id]/harvest-report-pdf` missing auth

- Status: fixed
- Betroffene Dateien: `src/app/api/grows/[id]/harvest-report-pdf/route.tsx`
- Was geändert wurde: Route now authenticates with bearer token or Supabase server session and scopes the grow query to `user_id = user.id`.
- Noch offenes Risiko: Needs live smoke against an owned grow because the route is owner-data dependent.

### H3. `/api/feedback/refine` missing auth

- Status: fixed
- Betroffene Dateien: `src/app/api/feedback/refine/route.ts`
- Was geändert wurde: POST uses `authenticateRequest` before calling the external AI API.
- Noch offenes Risiko: Add stricter body length validation before broader beta usage.

### H4-H5. Weak auth on consumption/reminders

- Status: fixed
- Betroffene Dateien: `src/app/api/consumption/[id]/route.ts`, `src/app/api/reminders/[id]/route.ts`
- Was geändert wurde: Both routes use `authenticateRequest`; consumption mutations are explicitly user-scoped.
- Noch offenes Risiko: Reminder ownership depends on the authenticated Supabase/RLS path.

### H6. `grow_milestones` invalid RLS cross-table reference

- Status: still open
- Betroffene Dateien: `supabase/migrations/20260412000000_grow_diary_module_abc.sql`
- Was geändert wurde: Not changed in this launch pass.
- Noch offenes Risiko: Historical policy definitions reference `grows.user_id` directly. Add a corrective migration using an `EXISTS` subquery before relying on milestone writes in beta.

### H7. `strain_reports` broad UPDATE

- Status: fixed
- Betroffene Dateien: `supabase/migrations/20260416200000_phase1_rls_security_fixes.sql`
- Was geändert wurde: UPDATE policy was replaced to require report owner or admin.
- Noch offenes Risiko: Admin membership expression still depends on current Supabase Auth identity behavior.

### H8. `organization_members` broad UPDATE/DELETE

- Status: fixed
- Betroffene Dateien: `supabase/migrations/20260425120000_launch_rls_hardening.sql`
- Was geändert wurde: Mutation policies now require an active `gründer` or `admin` membership in the same organization.
- Noch offenes Risiko: Apply and verify final live policies.

### H9. `organization_invites` broad create/revoke

- Status: fixed
- Betroffene Dateien: `supabase/migrations/20260425120000_launch_rls_hardening.sql`
- Was geändert wurde: Insert/update/delete now require active `gründer` or `admin`; insert also requires `invited_by = requesting_user_id()`.
- Noch offenes Risiko: Apply and verify final live policies.

### H10. `feedback_tickets` hardcoded admin UUID

- Status: still open
- Betroffene Dateien: `supabase/migrations/20260327000001_feedback_tickets.sql`
- Was geändert wurde: Not changed in this launch pass.
- Noch offenes Risiko: Hardcoded admin UUID remains in historical migration. Replace with a role/table-driven admin policy or server-side admin API path.

### H11. `csc_batches` duplicate UPDATE policy name

- Status: fixed
- Betroffene Dateien: `supabase/migrations/20260416200000_phase1_rls_security_fixes.sql`
- Was geändert wurde: Duplicate policy is dropped before recreating the intended policy.
- Noch offenes Risiko: Verify live migration order in Supabase.

### H12. Image uploads lack magic-byte validation

- Status: still open
- Betroffene Dateien: `src/app/api/profile/avatar/route.ts`, `src/app/api/organizations/[organizationId]/logo/route.ts`, `src/app/api/grows/log-entry/photo/route.ts`, `src/app/api/strains/[id]/user-image/route.ts`, `src/app/api/strains/[id]/image/route.ts`
- Was geändert wurde: MIME allowlists and size checks exist in upload routes, but content sniffing was not added.
- Noch offenes Risiko: A client can lie about MIME type. Add shared magic-byte validation before public upload expansion.

### H13-H15. Storage RLS broad upload/delete policies

- Status: still open
- Betroffene Dateien: `supabase/migrations/20260330150000_strain_image_admin.sql`, `supabase/migrations/20260329110000_org_logos_bucket.sql`, MinIO-backed upload routes under `src/app/api/**`
- Was geändert wurde: Newer code paths upload through server-side MinIO routes with auth/admin/ownership checks.
- Noch offenes Risiko: Historical Supabase Storage policies remain broad. Tighten or remove unused Supabase Storage bucket policies after confirming the MinIO cutover.

### H16. No numeric range validation on THC/CBD in strains POST

- Status: still open
- Betroffene Dateien: `src/app/api/strains/route.ts`
- Was geändert wurde: Type enum validation exists, but THC/CBD numeric ranges are not explicitly validated in the route.
- Noch offenes Risiko: Add server-side validation for 0-100 ranges and min/max ordering.

### H17. No string length limits on multiple POST routes

- Status: still open
- Betroffene Dateien: multiple POST routes under `src/app/api/**`
- Was geändert wurde: Not fully addressed in this launch pass.
- Noch offenes Risiko: Add route-specific schemas for public/beta write surfaces, starting with feedback, strain, grow entry, and community routes.
