-- Migration: Add organization_id to grows and grow_entries
-- Fixes: null value in column "organization_id" of relation "grow_entries"

-- Add organization_id to grows if missing
ALTER TABLE grows ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to grow_entries if missing
ALTER TABLE grow_entries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
