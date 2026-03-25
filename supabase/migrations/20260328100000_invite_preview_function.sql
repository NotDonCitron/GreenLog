-- Migration: Invite Preview Function
-- Date: 2026-03-25

-- Creates a SECURITY DEFINER function to get invite preview
-- This bypasses RLS for public invite preview pages

DROP FUNCTION IF EXISTS get_invite_preview(text);

CREATE OR REPLACE FUNCTION get_invite_preview(p_token_hash TEXT)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    email TEXT,
    role TEXT,
    status TEXT,
    expires_at TIMESTAMPTZ,
    org_name TEXT,
    org_type TEXT,
    invited_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        oi.id,
        oi.organization_id,
        oi.email::TEXT,
        oi.role::TEXT,
        oi.status::TEXT,
        oi.expires_at,
        o.name::TEXT,
        o.organization_type::TEXT,
        oi.invited_by
    FROM organization_invites oi
    JOIN organizations o ON o.id = oi.organization_id
    WHERE oi.token_hash = p_token_hash
      AND oi.status = 'pending'
      AND o.status = 'active';
END;
$$;
