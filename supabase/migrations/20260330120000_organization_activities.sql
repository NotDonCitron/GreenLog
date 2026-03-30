-- Organization Activity Log Table
-- Tracks all activities within organizations for audit trail

CREATE TABLE organization_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for system actions
  event_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  target_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_org_activities_org ON organization_activities(organization_id);
CREATE INDEX idx_org_activities_type ON organization_activities(event_type);
CREATE INDEX idx_org_activities_created ON organization_activities(created_at DESC);
CREATE INDEX idx_org_activities_org_created ON organization_activities(organization_id, created_at DESC);

-- RLS Policies
ALTER TABLE organization_activities ENABLE ROW LEVEL SECURITY;

-- SELECT: org admins (gründer, admin) with active membership
CREATE POLICY "Admins can view organization activities"
  ON organization_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_activities.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('gründer', 'admin')
        AND organization_members.status = 'active'
    )
  );

-- INSERT: any authenticated user (controlled by API routes)
CREATE POLICY "Authenticated users can insert activities"
  ON organization_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE organization_activities;

-- Comments
COMMENT ON TABLE organization_activities IS 'Audit trail for all activities within organizations';
COMMENT ON COLUMN organization_activities.event_type IS 'Type of event: strain_created, member_added, strain_updated, etc.';
COMMENT ON COLUMN organization_activities.target_type IS 'Entity type: strain, member, organization, etc.';
COMMENT ON COLUMN organization_activities.target_id IS 'ID of the affected entity';
COMMENT ON COLUMN organization_activities.metadata IS 'Additional event data as JSONB';