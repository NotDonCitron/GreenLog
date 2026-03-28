-- =============================================
-- Add organization_id to strains for multi-tenant support
-- =============================================

ALTER TABLE strains ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Index for organization-based strain queries
CREATE INDEX IF NOT EXISTS idx_strains_organization ON strains(organization_id);

-- Backfill: strains created by users who belong to orgs could be assigned
-- For now, leave as NULL (global strains)
