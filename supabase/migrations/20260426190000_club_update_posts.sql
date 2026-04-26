-- =============================================
-- Migration: club_update_posts table for CSC V1
-- Date: 2026-04-26 19:00:00
--
-- Dedicated table for CSC-Updates (admin-only in V1).
-- Separated from community_feed which is an
-- auto-generated event log without moderation.
--
-- V1 boundaries:
-- - admin-only (gründer/admin) read + write
-- - visibility locked to club_only
-- - soft-remove only, no hard delete
-- - no comments, no replies, no public access
-- =============================================

CREATE TABLE public.club_update_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  post_type TEXT NOT NULL CHECK (
    post_type IN (
      'announcement',
      'event',
      'compliance_notice',
      'documentation_note',
      'strain_info',
      'club_info',
      'system_notice',
      'poll_notice'
    )
  ),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'club_only'
    CHECK (visibility = 'club_only'),
  moderation_status TEXT NOT NULL DEFAULT 'active'
    CHECK (moderation_status IN ('active', 'hidden', 'removed')),
  hidden_at TIMESTAMPTZ,
  hidden_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  removed_at TIMESTAMPTZ,
  removed_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.club_update_posts ENABLE ROW LEVEL SECURITY;

-- SELECT: only org admins/founders can read
CREATE POLICY "Org admins can read club update posts"
  ON public.club_update_posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS actor
      WHERE actor.organization_id = club_update_posts.organization_id
        AND actor.user_id = requesting_user_id()
        AND actor.membership_status = 'active'
        AND actor.role IN ('gründer', 'admin')
    )
  );

-- INSERT: only org admins/founders can create; author_id must be self
CREATE POLICY "Org admins can create club update posts"
  ON public.club_update_posts
  FOR INSERT
  WITH CHECK (
    author_id = requesting_user_id()
    AND visibility = 'club_only'
    AND moderation_status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.organization_members AS actor
      WHERE actor.organization_id = club_update_posts.organization_id
        AND actor.user_id = requesting_user_id()
        AND actor.membership_status = 'active'
        AND actor.role IN ('gründer', 'admin')
    )
  );

-- UPDATE: only org admins/founders can update; visibility must stay club_only
CREATE POLICY "Org admins can update club update posts"
  ON public.club_update_posts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members AS actor
      WHERE actor.organization_id = club_update_posts.organization_id
        AND actor.user_id = requesting_user_id()
        AND actor.membership_status = 'active'
        AND actor.role IN ('gründer', 'admin')
    )
  )
  WITH CHECK (
    visibility = 'club_only'
    AND EXISTS (
      SELECT 1
      FROM public.organization_members AS actor
      WHERE actor.organization_id = club_update_posts.organization_id
        AND actor.user_id = requesting_user_id()
        AND actor.membership_status = 'active'
        AND actor.role IN ('gründer', 'admin')
    )
  );

-- Indexes
CREATE INDEX idx_club_update_posts_org_created
  ON public.club_update_posts (organization_id, created_at DESC);
CREATE INDEX idx_club_update_posts_org_status_created
  ON public.club_update_posts (organization_id, moderation_status, created_at DESC);
CREATE INDEX idx_club_update_posts_author
  ON public.club_update_posts (author_id);
