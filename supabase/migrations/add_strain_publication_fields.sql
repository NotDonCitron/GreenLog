-- Add publication lifecycle fields to strains table for Curated Strain Canon
ALTER TABLE strains ADD COLUMN IF NOT EXISTS publication_status TEXT CHECK (publication_status IN ('draft', 'review', 'published', 'rejected')) DEFAULT 'draft';
ALTER TABLE strains ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) CHECK (quality_score BETWEEN 0 AND 1);
ALTER TABLE strains ADD COLUMN IF NOT EXISTS primary_source TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS source_notes TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS canonical_image_path TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS reviewed_by TEXT REFERENCES profiles(id);

-- Update existing strains to draft status
UPDATE strains SET publication_status = 'draft' WHERE publication_status IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_strains_publication_status ON strains(publication_status);
CREATE INDEX IF NOT EXISTS idx_strains_quality_score ON strains(quality_score);