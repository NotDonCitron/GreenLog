-- =============================================
-- Canon Ingest — Schema Migration
-- Adds publication lifecycle fields to strains table
-- per the Curated Strain Canon Design spec §5
--
-- Run via Supabase SQL Editor
-- =============================================

-- Publication lifecycle status
ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS publication_status TEXT DEFAULT 'draft'
  CHECK (publication_status IN ('draft', 'review', 'published', 'rejected'));

-- Source provenance
ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS primary_source TEXT;

-- Internal quality ranking (never used for auto-publish)
ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC;

-- Internal editorial notes
ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS source_notes TEXT;

-- Editorial review tracking
ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

-- Index for fast catalog filtering
CREATE INDEX IF NOT EXISTS idx_strains_publication_status
  ON strains(publication_status);

-- Index for source-based queries
CREATE INDEX IF NOT EXISTS idx_strains_primary_source
  ON strains(primary_source);

-- Default all existing strains to 'draft' if not already set
UPDATE strains SET publication_status = 'draft'
  WHERE publication_status IS NULL;
