-- =============================================
-- Filter Presets Table
-- =============================================

CREATE TABLE filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 50),
  effects TEXT[],
  flavors TEXT[],
  thc_min NUMERIC(4,1),
  thc_max NUMERIC(4,1),
  cbd_min NUMERIC(4,1),
  cbd_max NUMERIC(4,1),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own presets"
  ON filter_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
