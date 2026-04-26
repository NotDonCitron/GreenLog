-- =============================================
-- Migration: Phase 7 moderation minimums
-- Date: 2026-04-26 23:00:00
--
-- Adds:
-- - content_reports
-- - user_reports
-- - user_blocks
-- - club_mutes
-- - moderation_actions
-- - community_rules_acceptances
-- =============================================

-- Content reports (post/feed level)
CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('club_update_post', 'community_feed')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 3 AND 200),
  details TEXT CHECK (details IS NULL OR char_length(trim(details)) <= 2000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  assigned_to TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_content_reports_open_unique
  ON public.content_reports (organization_id, reporter_id, content_type, content_id)
  WHERE status = 'open';
CREATE INDEX idx_content_reports_org_status_created
  ON public.content_reports (organization_id, status, created_at DESC);
CREATE INDEX idx_content_reports_reporter_created
  ON public.content_reports (reporter_id, created_at DESC);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can create content reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (
    reporter_id = requesting_user_id()
    AND is_org_member(organization_id)
  );

CREATE POLICY "Org admins can read content reports"
  ON public.content_reports FOR SELECT
  USING (can_manage_org(organization_id));

CREATE POLICY "Org admins can update content reports"
  ON public.content_reports FOR UPDATE
  USING (can_manage_org(organization_id))
  WITH CHECK (can_manage_org(organization_id));


-- User reports (user-level moderation)
CREATE TABLE public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id TEXT NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 3 AND 200),
  details TEXT CHECK (details IS NULL OR char_length(trim(details)) <= 2000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  assigned_to TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_user_id)
);

CREATE UNIQUE INDEX idx_user_reports_open_unique
  ON public.user_reports (organization_id, reporter_id, reported_user_id)
  WHERE status = 'open';
CREATE INDEX idx_user_reports_org_status_created
  ON public.user_reports (organization_id, status, created_at DESC);
CREATE INDEX idx_user_reports_reported_user
  ON public.user_reports (reported_user_id, created_at DESC);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can create user reports"
  ON public.user_reports FOR INSERT
  WITH CHECK (
    reporter_id = requesting_user_id()
    AND is_org_member(organization_id)
  );

CREATE POLICY "Org admins can read user reports"
  ON public.user_reports FOR SELECT
  USING (can_manage_org(organization_id));

CREATE POLICY "Org admins can update user reports"
  ON public.user_reports FOR UPDATE
  USING (can_manage_org(organization_id))
  WITH CHECK (can_manage_org(organization_id));


-- User blocks (club-level hard block)
CREATE TABLE public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  blocker_user_id TEXT NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user_id TEXT NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT CHECK (reason IS NULL OR char_length(trim(reason)) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, blocker_user_id, blocked_user_id),
  CHECK (blocker_user_id <> blocked_user_id)
);

CREATE INDEX idx_user_blocks_org_blocked
  ON public.user_blocks (organization_id, blocked_user_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage user blocks"
  ON public.user_blocks FOR ALL
  USING (can_manage_org(organization_id))
  WITH CHECK (can_manage_org(organization_id));

CREATE POLICY "Users can view if they are blocked"
  ON public.user_blocks FOR SELECT
  USING (blocked_user_id = requesting_user_id());


-- Club mutes (time-bounded posting/reporting restrictions)
CREATE TABLE public.club_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_by TEXT NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT CHECK (reason IS NULL OR char_length(trim(reason)) <= 500),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_club_mutes_org_user
  ON public.club_mutes (organization_id, user_id);
CREATE INDEX idx_club_mutes_expires_at
  ON public.club_mutes (expires_at);

ALTER TABLE public.club_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage mutes"
  ON public.club_mutes FOR ALL
  USING (can_manage_org(organization_id))
  WITH CHECK (can_manage_org(organization_id));

CREATE POLICY "Users can view own mute status"
  ON public.club_mutes FOR SELECT
  USING (user_id = requesting_user_id());


-- Moderation action audit log
CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'content_report_created',
      'user_report_created',
      'content_hidden',
      'content_removed',
      'user_blocked',
      'user_unblocked',
      'user_muted',
      'user_unmuted',
      'report_resolved'
    )
  ),
  target_type TEXT NOT NULL CHECK (
    target_type IN ('club_update_post', 'community_feed', 'user', 'content_report', 'user_report', 'club_mute', 'user_block')
  ),
  target_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_moderation_actions_org_created
  ON public.moderation_actions (organization_id, created_at DESC);
CREATE INDEX idx_moderation_actions_target
  ON public.moderation_actions (target_type, target_id);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can insert moderation actions for own actor id"
  ON public.moderation_actions FOR INSERT
  WITH CHECK (
    actor_id = requesting_user_id()
    AND is_org_member(organization_id)
  );

CREATE POLICY "Org admins can read moderation actions"
  ON public.moderation_actions FOR SELECT
  USING (can_manage_org(organization_id));


-- Community rules acceptance tracking
CREATE TABLE public.community_rules_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  rules_version TEXT NOT NULL DEFAULT 'v1',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, rules_version)
);

CREATE INDEX idx_community_rules_acceptances_org_user
  ON public.community_rules_acceptances (organization_id, user_id);

ALTER TABLE public.community_rules_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own rules acceptance"
  ON public.community_rules_acceptances FOR INSERT
  WITH CHECK (
    user_id = requesting_user_id()
    AND is_org_member(organization_id)
  );

CREATE POLICY "Users can read own rules acceptance"
  ON public.community_rules_acceptances FOR SELECT
  USING (user_id = requesting_user_id());

CREATE POLICY "Org admins can read all rules acceptances"
  ON public.community_rules_acceptances FOR SELECT
  USING (can_manage_org(organization_id));
