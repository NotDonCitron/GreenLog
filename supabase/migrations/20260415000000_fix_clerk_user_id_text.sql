-- ============================================================
-- Fix Clerk user_id type mismatch (UUID → TEXT)
-- Clerk user IDs are strings, not UUIDs
-- Fixes: "new row violates row level security policy" errors
-- ============================================================

-- 1. PLANTS table
ALTER TABLE plants ALTER COLUMN user_id TYPE TEXT;

-- 2. GROW_MILESTONES table
ALTER TABLE grow_milestones ALTER COLUMN user_id TYPE TEXT;

-- 3. GROW_COMMENTS table
ALTER TABLE grow_comments ALTER COLUMN user_id TYPE TEXT;

-- 4. GROW_FOLLOWS table
ALTER TABLE grow_follows ALTER COLUMN user_id TYPE TEXT;

-- 5. Also fix the is_active_org_member helper to accept TEXT (Clerk IDs)
-- The function signature needs to match since user_id is now TEXT
CREATE OR REPLACE FUNCTION is_active_org_member(p_user_id TEXT, p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id AND organization_id = p_org_id AND membership_status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;