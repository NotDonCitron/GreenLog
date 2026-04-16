-- Phase 1 Security Audit: RLS Policy Fixes
-- Date: 2026-04-16
-- Fixes: C4 (notifications INSERT), C5 (community_feed INSERT),
--        H5 (strain_reports UPDATE), H9 (duplicate csc_batches policy)

-- =============================================================
-- C4: Fix notifications INSERT — restrict to service role only
-- Was: WITH CHECK (true) allowing any user to spoof notifications
-- =============================================================
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "Service role inserts notifications"
    ON notifications FOR INSERT
    WITH CHECK (false);
-- Notifications are created by triggers and API routes using service role.
-- No client-side INSERT should be possible.

-- =============================================================
-- C5: Fix community_feed INSERT — restrict to service role only
-- Was: WITH CHECK (true) allowing any user to insert feed entries
-- =============================================================
DROP POLICY IF EXISTS "community_feed_insert_trigger" ON community_feed;
CREATE POLICY "Service role inserts community feed"
    ON community_feed FOR INSERT
    WITH CHECK (false);
-- Feed entries are created by triggers. No client-side INSERT needed.

-- =============================================================
-- H5: Fix strain_reports UPDATE — restrict to actual admins
-- Was: USING (auth.uid() IS NOT NULL) — any user could update
-- =============================================================
DROP POLICY IF EXISTS "Admins can update reports" ON strain_reports;
CREATE POLICY "Admins can update reports"
    ON strain_reports FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND auth.uid()::text IN (
            SELECT unnest(string_to_array(current_setting('app.admin_ids', true), ','))
        )
    );
-- Note: This requires setting app.admin_ids in Supabase dashboard or via
-- ALTER DATABASE SET app.admin_ids = 'uuid1,uuid2';
-- Alternatively, this can be relaxed to only the report creator + admins:
-- USING (auth.uid() = reporter_id)

-- =============================================================
-- H9: Fix duplicate csc_batches UPDATE policy
-- =============================================================
DROP POLICY IF EXISTS "csc_batches_update" ON csc_batches;
CREATE POLICY "csc_batches_update"
    ON csc_batches FOR UPDATE
    USING (
        is_active_org_member(auth.uid()::text, organization_id)
        AND (
            SELECT role FROM organization_members
            WHERE user_id = auth.uid()::text
            AND organization_id = csc_batches.organization_id
            AND membership_status = 'active'
            LIMIT 1
        ) IN ('gründer', 'admin')
    );

-- =============================================================
-- Revoke excessive GRANT ALL on community tables
-- =============================================================
REVOKE ALL ON community_feed FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON community_feed TO anon, authenticated;

REVOKE ALL ON community_followers FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON community_followers TO anon, authenticated;

-- =============================================================
-- Revoke anon EXECUTE on trigger function
-- =============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_new_follower') THEN
        REVOKE EXECUTE ON FUNCTION notify_new_follower() FROM anon;
    END IF;
END $$;
