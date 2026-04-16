# Phase 1: Security Audit Findings

**Date:** 2026-04-16
**Auditor:** Claude Opus 4.6
**Scope:** Full codebase — RLS, Auth, API validation, CSC compliance, Storage

---

## Executive Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| CRITICAL | 7 | Unauthenticated API routes, notification spoofing, admin ID leak, RLS bypass |
| HIGH | 17 | Missing auth, broken RLS policies, no magic-bytes validation, missing input validation |
| MEDIUM | 15 | Inconsistent auth, weak validation, storage policy gaps |
| LOW | 7 | Minor info disclosure, cleanup items |

---

## CRITICAL Findings (Must Fix)

### C1. `/api/test-notification` GET — Unauthenticated admin endpoint
Uses `getSupabaseAdmin()` (service role) with NO auth. Anyone can query any user's notifications.

### C2. `/api/consumption/[id]` — No auth on GET/PATCH/DELETE
Completely unprotected CRUD. Any caller can read/modify/delete consumption logs.

### C3. `/api/reminders/[id]` — No auth on PATCH/DELETE
Completely unprotected. Any caller can modify/delete reminders.

### C4. `notifications` INSERT policy `WITH CHECK (true)`
Any authenticated user can insert notifications for ANY user (spoofing).

### C5. `community_feed` INSERT policy `WITH CHECK (true)`
Any authenticated user can insert feed entries for ANY organization.

### C6. `NEXT_PUBLIC_APP_ADMIN_IDS` leaks admin UUIDs to client bundle
Env var with `NEXT_PUBLIC_` prefix is bundled into client JS, visible to all.

### C7. `auth.uid()` vs `requesting_user_id()` inconsistency
Post-Clerk migration, many RLS policies still use different identity functions.

---

## HIGH Findings

### H1-H3. Missing auth: `/api/grow-entries`, `/api/grows/[id]/harvest-report-pdf`, `/api/feedback/refine`
### H4-H5. Weak auth (cookie check, no getUser): `/api/consumption`, `/api/reminders`
### H6. `grow_milestones` RLS — invalid cross-table reference (broken INSERT/UPDATE/DELETE)
### H7. `strain_reports` UPDATE — any authenticated user can update any report
### H8. `organization_members` UPDATE/DELETE — any active member can modify any membership
### H9. `organization_invites` — any member role can create/revoke invites
### H10. `feedback_tickets` UPDATE/DELETE — hardcoded admin UUID
### H11. `csc_batches` — duplicate UPDATE policy name
### H12. Storage: No magic-bytes validation on image uploads
### H13-H15. Storage RLS: `strains-images`, `strains`, `org-logos` — any user can upload/delete
### H16. No numeric range validation on THC/CBD in strains POST
### H17. No string length limits on multiple POST routes

---

## CSC Compliance: PASS (with minor recommendations)

- DB trigger correctly implements all KCanG limits (25g/day, 50g/month, 30g/month, THC 10% for 18-21)
- Trigger is SECURITY DEFINER, cannot be bypassed
- Age calculation correct
- Recommendation: Explicitly set `dispensed_at` in API to prevent future regression
- Recommendation: Use UTC for timezone consistency between JS and Postgres
