-- =============================================
-- GreenLog Database Schema
-- Last synced: 2026-03-28
-- NOTE: Tables marked with [MISSING] don't exist in DB yet
-- =============================================

-- =============================================
-- 0. HELPER FUNCTIONS
-- Function to extract Clerk user ID from Supabase JWT
-- Supports both: native Clerk->Supabase integration AND custom JWT templates
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Try auth.jwt() first (works with Clerk native integration)
  RETURN (auth.jwt() ->> 'sub')::TEXT;
EXCEPTION WHEN OTHERS THEN
  -- Fallback: try current_setting for custom JWT templates
  RETURN NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- (must be defined before tables that use them)
-- =============================================

-- Helper function to check org membership without RLS recursion
-- Uses SECURITY DEFINER to bypass RLS when checking membership
CREATE OR REPLACE FUNCTION is_active_org_member(p_user_id TEXT, p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id AND organization_id = p_org_id AND membership_status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- 1. ORGANIZATIONS (Clubs, Apotheken)
-- =============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  organization_type TEXT CHECK (organization_type IN ('club', 'pharmacy')) NOT NULL,
  license_number TEXT,
  status TEXT CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active',
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  avatar_url TEXT,
  description TEXT,
  logo_url TEXT,
  requires_member_approval BOOLEAN DEFAULT false NOT NULL
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Organizations sind öffentlich sichtbar (für B2B Plattform)
CREATE POLICY "Organizations are viewable by everyone"
  ON organizations FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT WITH CHECK (requesting_user_id() IS NOT NULL);

CREATE POLICY "Founders and admins can update organizations"
  ON organizations FOR UPDATE USING (
    requesting_user_id() = created_by
    OR EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organizations.id
      AND user_id = requesting_user_id()
      AND role IN ('gründer', 'admin')
      AND membership_status = 'active'
    )
  );

CREATE POLICY "Founders can delete organizations"
  ON organizations FOR DELETE USING (requesting_user_id() = created_by);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_type ON organizations(organization_type);


-- =============================================
-- 1. ORGANIZATION_MEMBERS
-- =============================================

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('gründer', 'admin', 'member', 'viewer')) NOT NULL DEFAULT 'member',
  membership_status TEXT CHECK (membership_status IN ('active', 'invited', 'removed', 'pending')) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT now(),
  invited_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  rejection_reason TEXT,
  UNIQUE(organization_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own membership"
  ON organization_members FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = requesting_user_id()
      AND m.membership_status = 'active'
    )
    AND membership_status != 'pending'
  );

CREATE POLICY "Admins can view pending members"
  ON organization_members FOR SELECT USING (
    membership_status = 'pending'
    AND EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = requesting_user_id()
      AND m.role IN ('admin', 'gründer')
      AND m.membership_status = 'active'
    )
  );

CREATE POLICY "Admins can add members"
  ON organization_members FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members AS m
      WHERE m.organization_id = organization_members.organization_id
      AND m.user_id = requesting_user_id()
      AND m.role IN ('gründer', 'admin')
      AND m.membership_status = 'active'
    )
  );

CREATE POLICY "Members can update own membership, admins can update any"
  ON organization_members FOR UPDATE USING (
    requesting_user_id() = user_id
    OR is_active_org_member(requesting_user_id(), organization_id)
  );

CREATE POLICY "Members can leave, admins can remove"
  ON organization_members FOR DELETE USING (
    requesting_user_id() = user_id
    OR is_active_org_member(requesting_user_id(), organization_id)
  );

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_status ON organization_members(organization_id, membership_status);


-- =============================================
-- 2. ORGANIZATION_INVITES
-- =============================================

CREATE TABLE organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member', 'viewer')) NOT NULL DEFAULT 'member',
  token_hash TEXT,
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  invited_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see org invites, inviters see own"
  ON organization_invites FOR SELECT USING (
    is_active_org_member(requesting_user_id(), organization_id)
    OR invited_by = requesting_user_id()
  );

CREATE POLICY "Admins can create invites"
  ON organization_invites FOR INSERT WITH CHECK (
    is_active_org_member(requesting_user_id(), organization_id)
  );

CREATE POLICY "Admins can revoke invites"
  ON organization_invites FOR UPDATE USING (
    is_active_org_member(requesting_user_id(), organization_id)
  );

CREATE POLICY "Admins can delete invites"
  ON organization_invites FOR DELETE USING (
    is_active_org_member(requesting_user_id(), organization_id)
  );

CREATE INDEX idx_org_invites_org ON organization_invites(organization_id);
CREATE INDEX idx_org_invites_email ON organization_invites(email);


-- =============================================
-- 3. FOLLOWS (User Follows)
-- =============================================

CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT USING (true);

CREATE POLICY "Users can follow"
  ON follows FOR INSERT WITH CHECK (requesting_user_id() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE USING (requesting_user_id() = follower_id);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Helper function for creating follows via API (bypasses RLS for approve flow)
CREATE OR REPLACE FUNCTION create_follow(follower_uuid TEXT, following_uuid TEXT)
RETURNS TEXT AS $
DECLARE
  follow_id TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM follows WHERE follower_id = follower_uuid AND following_id = following_uuid) THEN
    RETURN NULL;
  END IF;
  INSERT INTO follows (follower_id, following_id) VALUES (follower_uuid, following_uuid) RETURNING id INTO follow_id;
  RETURN follow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 4. FOLLOW_REQUESTS (Private Profile Follows)
-- =============================================

CREATE TABLE follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, target_id)
);

ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own requests"
  ON follow_requests FOR SELECT USING (requesting_user_id() = requester_id OR requesting_user_id() = target_id);

CREATE POLICY "Users can send follow requests"
  ON follow_requests FOR INSERT WITH CHECK (requesting_user_id() = requester_id);

CREATE POLICY "Target can accept/decline"
  ON follow_requests FOR UPDATE USING (requesting_user_id() = target_id);

CREATE POLICY "Requester or target can delete"
  ON follow_requests FOR DELETE USING (requesting_user_id() = requester_id OR requesting_user_id() = target_id);

CREATE INDEX idx_follow_requests_requester ON follow_requests(requester_id);
CREATE INDEX idx_follow_requests_target ON follow_requests(target_id);


-- =============================================
-- 5. USER_ACTIVITIES (Activity Feed)
-- =============================================

CREATE TABLE user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  target_image_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public activities viewable by all"
  ON user_activities FOR SELECT USING (is_public = true OR requesting_user_id() = user_id);

CREATE POLICY "Users can create activities"
  ON user_activities FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own activities"
  ON user_activities FOR UPDATE USING (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own activities"
  ON user_activities FOR DELETE USING (requesting_user_id() = user_id);

CREATE INDEX idx_user_activities_user ON user_activities(user_id);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_public ON user_activities(is_public);


-- =============================================
-- 6. PROFILES (extends Supabase Auth)
-- =============================================
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (requesting_user_id() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (requesting_user_id() = id);


-- =============================================
-- 7. STRAINS (Cannabis-Sorten)
-- =============================================
CREATE TABLE strains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('indica', 'sativa', 'hybrid')) NOT NULL,
  thc_min DECIMAL(4,1),
  thc_max DECIMAL(4,1),
  cbd_min DECIMAL(4,1),
  cbd_max DECIMAL(4,1),
  description TEXT,
  effects TEXT[] DEFAULT '{}',
  flavors TEXT[] DEFAULT '{}',
  terpenes TEXT[] DEFAULT '{}',
  image_url TEXT,
  image_attribution JSONB DEFAULT '{"source": "none"}',
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE strains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strains are viewable by everyone"
  ON strains FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add strains"
  ON strains FOR INSERT WITH CHECK (requesting_user_id() IS NOT NULL);


-- =============================================
-- 8. RATINGS (Bewertungen)
-- =============================================
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5) NOT NULL,
  taste_rating SMALLINT CHECK (taste_rating BETWEEN 1 AND 5),
  effect_rating SMALLINT CHECK (effect_rating BETWEEN 1 AND 5),
  look_rating SMALLINT CHECK (look_rating BETWEEN 1 AND 5),
  review TEXT,
  consumption_method TEXT CHECK (consumption_method IN ('joint', 'bong', 'vaporizer', 'pipe', 'edible', 'other')),
  location TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(strain_id, user_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone"
  ON ratings FOR SELECT USING (true);

CREATE POLICY "Users can create own ratings"
  ON ratings FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own ratings"
  ON ratings FOR UPDATE USING (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON ratings FOR DELETE USING (requesting_user_id() = user_id);


-- =============================================
-- 9. GROWS (Grow-Tagebuch)
-- =============================================
CREATE TABLE grows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  grow_type TEXT CHECK (grow_type IN ('indoor', 'outdoor', 'greenhouse')) NOT NULL,
  medium TEXT CHECK (medium IN ('soil', 'coco', 'hydro', 'aero')),
  light_type TEXT,
  nutrients TEXT,
  start_date DATE,
  harvest_date DATE,
  yield_grams DECIMAL(6,1),
  status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE grows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public grows are viewable by everyone"
  ON grows FOR SELECT USING (is_public = true OR requesting_user_id() = user_id);

CREATE POLICY "Users can create own grows"
  ON grows FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own grows"
  ON grows FOR UPDATE USING (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own grows"
  ON grows FOR DELETE USING (requesting_user_id() = user_id);


-- =============================================
-- 9b. PLANTS (Einzelne Pflanzen in einem Grow)
-- =============================================
CREATE TABLE plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_id UUID REFERENCES grows(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plant_name TEXT NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('seedling', 'vegetative', 'flowering', 'flushing', 'harvested', 'destroyed')) DEFAULT 'seedling',
  planted_at TIMESTAMPTZ DEFAULT now(),
  harvested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE plants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plants"
  ON plants FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Users can create own plants"
  ON plants FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own plants"
  ON plants FOR UPDATE USING (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own plants"
  ON plants FOR DELETE USING (requesting_user_id() = user_id);

CREATE INDEX idx_plants_grow ON plants(grow_id);
CREATE INDEX idx_plants_user ON plants(user_id);
CREATE INDEX idx_plants_status ON plants(status);


-- =============================================
-- 10. GROW ENTRIES (Tagebuch-Einträge)
-- =============================================
CREATE TABLE grow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_id UUID REFERENCES grows(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plant_id UUID REFERENCES plants(id) ON DELETE SET NULL,
  entry_type TEXT CHECK (entry_type IN ('watering', 'feeding', 'note', 'photo', 'ph_ec', 'dli', 'milestone')),
  content JSONB DEFAULT '{}',
  entry_date DATE DEFAULT CURRENT_DATE,
  day_number INT,
  title TEXT,
  notes TEXT,
  image_url TEXT,
  height_cm DECIMAL(5,1),
  temperature DECIMAL(4,1),
  humidity DECIMAL(4,1),
  ph_value DECIMAL(3,1),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE grow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grow entries follow grow visibility"
  ON grow_entries FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM grows
      WHERE grows.id = grow_entries.grow_id
      AND (grows.is_public = true OR grows.user_id = requesting_user_id())
    )
  );

CREATE POLICY "Users can create entries for own grows"
  ON grow_entries FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own entries"
  ON grow_entries FOR UPDATE USING (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own entries"
  ON grow_entries FOR DELETE USING (requesting_user_id() = user_id);


-- =============================================
-- 11. VIEWS
-- =============================================

-- Average rating per strain
CREATE VIEW strain_ratings AS
SELECT
  strain_id,
  COUNT(*) as rating_count,
  ROUND(AVG(overall_rating), 1) as avg_overall,
  ROUND(AVG(taste_rating), 1) as avg_taste,
  ROUND(AVG(effect_rating), 1) as avg_effect,
  ROUND(AVG(look_rating), 1) as avg_look
FROM ratings
GROUP BY strain_id;

-- Indexes
CREATE INDEX idx_ratings_strain ON ratings(strain_id);
CREATE INDEX idx_ratings_user ON ratings(user_id);
CREATE INDEX idx_grows_user ON grows(user_id);
CREATE INDEX idx_grows_strain ON grows(strain_id);
CREATE INDEX idx_grow_entries_grow ON grow_entries(grow_id);
CREATE INDEX idx_strains_slug ON strains(slug);
CREATE INDEX idx_strains_type ON strains(type);


-- =============================================
-- 12. USER STRAIN RELATIONS (Favorites/Wishlist) [MISSING in DB]
-- =============================================
CREATE TABLE user_strain_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  is_wishlist BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, strain_id)
);

ALTER TABLE user_strain_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relations"
  ON user_strain_relations FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Users can insert own relations"
  ON user_strain_relations FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own relations"
  ON user_strain_relations FOR UPDATE USING (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own relations"
  ON user_strain_relations FOR DELETE USING (requesting_user_id() = user_id);

CREATE INDEX idx_user_strain_relations_user ON user_strain_relations(user_id);
CREATE INDEX idx_user_strain_relations_strain ON user_strain_relations(strain_id);


-- =============================================
-- 13. USER BADGES [MISSING in DB]
-- =============================================
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Users can insert own badges"
  ON user_badges FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own badges"
  ON user_badges FOR DELETE USING (requesting_user_id() = user_id);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);


-- =============================================
-- 14. USER COLLECTION (Private notes, batch info, personal data)
-- =============================================
CREATE TABLE user_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strain_id UUID REFERENCES strains(id) ON DELETE CASCADE NOT NULL,
  user_notes TEXT,
  batch_info TEXT,
  user_image_url TEXT,
  user_thc_percent DECIMAL(4,1),
  user_cbd_percent DECIMAL(4,1),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, strain_id)
);

ALTER TABLE user_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collection"
  ON user_collection FOR SELECT USING (requesting_user_id() = user_id);

CREATE POLICY "Users can insert own collection"
  ON user_collection FOR INSERT WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update own collection"
  ON user_collection FOR UPDATE USING (requesting_user_id() = user_id);

CREATE POLICY "Users can delete own collection"
  ON user_collection FOR DELETE USING (requesting_user_id() = user_id);

CREATE INDEX idx_user_collection_user ON user_collection(user_id);
CREATE INDEX idx_user_collection_strain ON user_collection(strain_id);
