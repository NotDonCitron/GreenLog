-- Migration: add farmer field to strains
-- Date: 2026-03-24
-- Description: Stores the farmer for strain entries and prevents blank farmer values.

ALTER TABLE strains
ADD COLUMN IF NOT EXISTS farmer TEXT;

UPDATE strains
SET farmer = NULL
WHERE farmer IS NOT NULL
  AND btrim(farmer) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'strains_farmer_not_blank'
  ) THEN
    ALTER TABLE strains
    ADD CONSTRAINT strains_farmer_not_blank
    CHECK (farmer IS NULL OR btrim(farmer) <> '');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_strains_farmer ON strains(farmer);
