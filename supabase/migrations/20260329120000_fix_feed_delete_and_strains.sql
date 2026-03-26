-- =============================================
-- Fix community_feed DELETE policy + strains visibility
-- =============================================

-- 1. Add DELETE policy to community_feed (was missing entirely)
-- Allow deletion if user is the creator OR is gründer/admin of the organization
DROP POLICY IF EXISTS "Users can delete own feed entries" ON community_feed;
CREATE POLICY "Users can delete own feed entries"
  ON community_feed FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = community_feed.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.membership_status = 'active'
        AND organization_members.role IN ('gründer', 'admin')
    )
  );

-- 2. Update strains SELECT policy to be more permissive
-- Allow viewing strains if: public (no org), org member, or created by user
DROP POLICY IF EXISTS "Strains viewable by all" ON strains;
CREATE POLICY "Strains viewable by all"
  ON strains FOR SELECT USING (
    organization_id IS NULL
    OR is_org_member(organization_id)
    OR auth.uid() = created_by
  );
