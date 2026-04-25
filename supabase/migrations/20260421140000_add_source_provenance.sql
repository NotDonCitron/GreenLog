ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS source_provenance JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_strains_source_provenance
  ON strains USING GIN (source_provenance);
