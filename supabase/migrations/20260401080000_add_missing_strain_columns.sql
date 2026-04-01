-- Add missing columns to strains table to match TypeScript types
-- Issue: TypeScript Strain type had fields not in schema, causing silent data loss on insert

ALTER TABLE strains ADD COLUMN IF NOT EXISTS avg_thc DECIMAL(5,2);
ALTER TABLE strains ADD COLUMN IF NOT EXISTS avg_cbd DECIMAL(5,2);
ALTER TABLE strains ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS farmer TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS irradiation TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pharmacy';
ALTER TABLE strains ADD COLUMN IF NOT EXISTS genetics TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS indications TEXT[];
ALTER TABLE strains ADD COLUMN IF NOT EXISTS is_medical BOOLEAN DEFAULT false;

-- Update type constraint to include ruderalis
ALTER TABLE strains DROP CONSTRAINT IF EXISTS strains_type_check;
ALTER TABLE strains ADD CONSTRAINT strains_type_check CHECK (type IN ('indica', 'sativa', 'hybrid', 'ruderalis'));
