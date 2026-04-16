-- Migration ID intentionally different to avoid conflict with existing 20260416130000
-- Add missing UPDATE policy for csc_batches (quality check PATCH was being blocked by RLS)
CREATE POLICY "csc_batches_update" ON csc_batches
  FOR UPDATE USING (
    is_active_org_member(requesting_user_id(), organization_id)
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = csc_batches.organization_id
      AND user_id = requesting_user_id()
      AND role IN ('gründer', 'admin')
    )
  );
