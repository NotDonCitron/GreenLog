-- ============================================================
-- Grow-Diary Module A/B/C — KCanG § 9 Compliant
-- Max 3 active plants per user across all grows
-- Stack: Next.js 15 App Router + Clerk + Supabase RLS
-- ============================================================

-- 1. ENUMS
-- ============================================================

CREATE TYPE plant_status AS ENUM (
  'seedling', 'vegetative', 'flowering', 'flushing', 'harvested', 'destroyed'
);

CREATE TYPE grow_mode AS ENUM ('autoflower', 'photoperiod');

-- 2. PLANTS TABLE (new — enforces 3-plant limit per user)
-- ============================================================

CREATE TABLE plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_id UUID REFERENCES grows(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE SET NULL,
  plant_name TEXT NOT NULL,
  status plant_status DEFAULT 'seedling' NOT NULL,
  planted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  harvested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE plants ENABLE ROW LEVEL SECURITY;

-- RLS: owner sees all; public grows are readable by everyone
CREATE POLICY "Plants viewable by grow owner or if grow is public"
  ON plants FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM grows
      WHERE grows.id = plants.grow_id
      AND (grows.is_public = true OR grows.user_id = requesting_user_id())
    )
  );

CREATE POLICY "Users can insert own plants"
  ON plants FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own plants"
  ON plants FOR UPDATE USING (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own plants"
  ON plants FOR DELETE USING (requesting_user_id() = user_id);

-- 3. 3-PLANT LIMIT TRIGGER (KCanG § 9)
-- ============================================================

-- Only counts plants in active statuses (seedling/vegetative/flowering/flushing).
-- Harvested and destroyed plants do NOT count toward the limit.

CREATE OR REPLACE FUNCTION plants_limit_check()
RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
BEGIN
  -- Only enforce when inserting or moving TO an active status
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('seedling', 'vegetative', 'flowering', 'flushing') THEN
      SELECT COUNT(*) INTO active_count
      FROM plants
      WHERE user_id = NEW.user_id
        AND status IN ('seedling', 'vegetative', 'flowering', 'flushing');
      IF active_count >= 3 THEN
        RAISE EXCEPTION 'KCanG Compliance Error: Max 3 active plants allowed per user (§ 9 KCanG).';
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only check if transitioning TO an active status
    IF NEW.status IN ('seedling', 'vegetative', 'flowering', 'flushing')
       AND OLD.status NOT IN ('seedling', 'vegetative', 'flowering', 'flushing') THEN
      SELECT COUNT(*) INTO active_count
      FROM plants
      WHERE user_id = NEW.user_id
        AND status IN ('seedling', 'vegetative', 'flowering', 'flushing')
        AND id != NEW.id;  -- exclude the plant being updated
      IF active_count >= 3 THEN
        RAISE EXCEPTION 'KCanG Compliance Error: Max 3 active plants allowed per user (§ 9 KCanG).';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plants_limit
  BEFORE INSERT OR UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION plants_limit_check();

-- 4. GROW_MILESTONES TABLE
-- ============================================================

CREATE TABLE grow_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_id UUID REFERENCES grows(id) ON DELETE CASCADE NOT NULL,
  phase TEXT CHECK (phase IN ('germination', 'vegetation', 'flower', 'flush', 'harvest')) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ended_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE grow_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Milestones viewable by grow owner or if grow is public"
  ON grow_milestones FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM grows
      WHERE grows.id = grow_milestones.grow_id
      AND (grows.is_public = true OR grows.user_id = requesting_user_id())
    )
  );

CREATE POLICY "Users can create milestones for own grows"
  ON grow_milestones FOR INSERT WITH CHECK (requesting_user_id() = grows.user_id);

CREATE POLICY "Users can update own milestones"
  ON grow_milestones FOR UPDATE USING (requesting_user_id() = grows.user_id);

CREATE POLICY "Users can delete own milestones"
  ON grow_milestones FOR DELETE USING (requesting_user_id() = grows.user_id);

-- 5. GROW_ENTRIES — add plant_id + entry_type + content (JSONB)
-- ============================================================

ALTER TABLE grow_entries
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES plants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entry_type TEXT CHECK (entry_type IN ('watering', 'feeding', 'note', 'photo', 'ph_ec', 'dli', 'milestone')),
  ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS entry_date DATE DEFAULT CURRENT_DATE;

-- RLS already exists; update to also check plant_id join if plant exists
ALTER TABLE grow_entries DROP POLICY IF EXISTS "Grow entries follow grow visibility";
CREATE POLICY "Grow entries viewable by grow owner or if grow is public"
  ON grow_entries FOR SELECT USING (
    (
      EXISTS (
        SELECT 1 FROM grows
        WHERE grows.id = grow_entries.grow_id
        AND (grows.is_public = true OR grows.user_id = requesting_user_id())
      )
    )
    OR
    (
      plant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM plants p
        JOIN grows g ON g.id = p.grow_id
        WHERE p.id = grow_entries.plant_id
        AND (g.is_public = true OR g.user_id = requesting_user_id())
      )
    )
  );

-- 6. GROW_PRESETS TABLE
-- ============================================================

CREATE TABLE grow_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grow_mode grow_mode NOT NULL,
  light_cycle TEXT NOT NULL,  -- e.g. '18/6', '12/12'
  estimated_veg_days INT DEFAULT 30,
  estimated_flower_days INT DEFAULT 60,
  ppfd_value INT,  -- default PPFD for this preset (umol/m²/s)
  is_public BOOLEAN DEFAULT true NOT NULL,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE grow_presets ENABLE ROW LEVEL SECURITY;

-- Everyone can read public presets; owner can read their own private ones
CREATE POLICY "Public presets readable by all; private only by creator"
  ON grow_presets FOR SELECT USING (
    is_public = true OR requesting_user_id() = created_by
  );

CREATE POLICY "Authenticated users can create presets"
  ON grow_presets FOR INSERT WITH CHECK (requesting_user_id() IS NOT NULL);

CREATE POLICY "Users can update own presets"
  ON grow_presets FOR UPDATE USING (requesting_user_id() = created_by);

CREATE POLICY "Users can delete own presets"
  ON grow_presets FOR DELETE USING (requesting_user_id() = created_by);

-- Seed default presets
INSERT INTO grow_presets (name, grow_mode, light_cycle, estimated_veg_days, estimated_flower_days, ppfd_value, is_public) VALUES
  ('Autoflower Standard', 'autoflower', '18/6', 14, 49, 500, true),
  ('Photoperiod Indoor', 'photoperiod', '18/6', 42, 63, 700, true),
  ('Sonniges Outdoor', 'photoperiod', 'sun', 60, 90, 800, true),
  ('LED 300W Budget', 'photoperiod', '18/6', 30, 56, 400, true),
  ('LED 600W Profi', 'photoperiod', '18/6', 35, 63, 700, true),
  ('CFL Low Heat', 'photoperiod', '18/6', 28, 49, 300, true);

-- 7. GROW_COMMENTS TABLE (flat — no nesting)
-- ============================================================

CREATE TABLE grow_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_entry_id UUID REFERENCES grow_entries(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE grow_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comments"
  ON grow_comments FOR SELECT USING (requesting_user_id() IS NOT NULL);

CREATE POLICY "Authenticated users can create comments"
  ON grow_comments FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own comments"
  ON grow_comments FOR DELETE USING (requesting_user_id() = user_id);

-- 8. GROW_FOLLOWS TABLE
-- ============================================================

CREATE TABLE grow_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  grow_id UUID REFERENCES grows(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, grow_id)  -- one follow per user per grow
);

ALTER TABLE grow_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grow follows readable by owner"
  ON grow_follows FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Authenticated users can follow"
  ON grow_follows FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can unfollow"
  ON grow_follows FOR DELETE USING (requesting_user_id() = user_id);

-- 9. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_plants_grow ON plants(grow_id);
CREATE INDEX IF NOT EXISTS idx_plants_user ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_plants_status ON plants(status);
CREATE INDEX IF NOT EXISTS idx_grow_milestones_grow ON grow_milestones(grow_id);
CREATE INDEX IF NOT EXISTS idx_grow_entries_plant ON grow_entries(plant_id);
CREATE INDEX IF NOT EXISTS idx_grow_entries_entry_type ON grow_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_grow_comments_entry ON grow_comments(grow_entry_id);
CREATE INDEX IF NOT EXISTS idx_grow_follows_grow ON grow_follows(grow_id);
CREATE INDEX IF NOT EXISTS idx_grow_follows_user ON grow_follows(user_id);
