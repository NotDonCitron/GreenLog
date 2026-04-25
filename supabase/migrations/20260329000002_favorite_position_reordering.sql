-- Add position column for drag-and-drop reordering of favorites
-- Migrate existing favorite_rank values to position (offset by 1000 to avoid conflicts during transition)
ALTER TABLE user_strain_relations ADD COLUMN IF NOT EXISTS position INTEGER;
UPDATE user_strain_relations SET position = (favorite_rank + 1000) WHERE favorite_rank IS NOT NULL;
ALTER TABLE user_strain_relations ALTER COLUMN position SET DEFAULT 0;
ALTER TABLE user_strain_relations ALTER COLUMN position DROP NOT NULL;
