export interface Terpene {
  name: string;
  percent?: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  organization_type: 'club' | 'pharmacy';
  license_number: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'staff' | 'member';
  membership_status: 'invited' | 'active' | 'suspended';
  joined_at: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  organizations?: Organization | null;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'staff' | 'member';
  token_hash: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Strain {
  id: string;
  name: string;
  slug: string;
  type: 'indica' | 'sativa' | 'hybrid' | 'ruderalis';
  brand?: string;
  manufacturer?: string;
  farmer?: string;
  irradiation?: string;
  avg_thc?: number;
  avg_cbd?: number;
  thc_min?: number;
  thc_max?: number;
  cbd_min?: number;
  cbd_max?: number;
  image_url?: string;
  description?: string;
  terpenes?: (string | Terpene)[];
  flavors?: string[];
  effects?: string[];
  genetics?: string;
  indications?: string[];
  is_medical?: boolean;
  // Custom strain fields
  is_custom?: boolean;
  source?: 'pharmacy' | 'street' | 'grow' | 'csc' | 'other';
  created_by?: string;
  // Organization scoping
  organization_id?: string | null;
}

export interface OrganizationStrain extends Strain {
  organization?: {
    id: string;
    name: string;
    slug: string;
    organization_type: 'club' | 'pharmacy';
  };
}

export type StrainSource = 'pharmacy' | 'street' | 'grow' | 'csc' | 'other';

export interface Grow {
  id: string;
  user_id: string;
  organization_id: string;
  strain_id: string | null;
  title: string;
  grow_type: 'indoor' | 'outdoor' | 'greenhouse';
  status: 'active' | 'completed' | 'archived';
  start_date: string;
  harvest_date?: string;
  is_public: boolean;
  strains?: {
    name: string;
  };
}

export interface ProfileStats {
  totalStrains: number;
  totalGrows: number;
  favoriteCount: number;
  unlockedBadgeCount: number;
  xp: number;
  level: number;
  progressToNextLevel: number;
  followers: number;
  following: number;
}

export interface ProfileIdentity {
  email: string | null;
  username: string;
  displayName: string;
  initials: string;
  avatarUrl?: string | null;
  profileVisibility: 'public' | 'private';
  tagline: string;
  bio?: string | null;
}

export interface ProfileFavorite {
  relationId: string;
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  type: Strain['type'] | null;
  thcDisplay: string;
  position: number | null;
}

export interface ProfileBadge {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  rarity: string;
  unlockedAt?: string;
}

export interface ProfileActivityItem {
  id: string;
  title: string;
  detail: string;
  value: string;
  tone: 'neutral' | 'accent' | 'success';
}

export interface PublicProfilePreview {
  title: string;
  description: string;
  chips: string[];
}

export interface ProfileViewModel {
  identity: ProfileIdentity;
  stats: ProfileStats;
  favorites: ProfileFavorite[];
  badges: ProfileBadge[];
  activity: ProfileActivityItem[];
  preview: PublicProfilePreview;
}

// Database row types for Supabase
export interface UserStrainRelation {
  id: string;
  user_id: string;
  strain_id: string;
  is_favorite: boolean;
  is_wishlist: boolean;
  position: number | null;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
}

export interface RatingRow {
  id: string;
  strain_id: string;
  user_id: string;
  overall_rating: number;
  taste_rating: number | null;
  effect_rating: number | null;
  look_rating: number | null;
  review: string | null;
  consumption_method: string | null;
  location: string | null;
  image_url: string | null;
  created_at: string;
}

// Social Features Types
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'rating' | 'grow_started' | 'grow_completed' | 'badge_earned' | 'favorite_added';
  target_id: string;
  target_name: string;
  target_image_url?: string;
  metadata: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  // Joined data
  user?: ProfileRow;
}

export interface FollowRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface ProfileWithStats extends ProfileRow {
  stats: ProfileStats;
  followers_count: number;
  following_count: number;
  is_following?: boolean;
  is_following_me?: boolean;
}

export interface SocialFeedItem {
  activity: UserActivity;
  user: ProfileRow;
}

export interface SuggestedUser {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  common_strains_count?: number;
  followers_count?: number;
  profile_visibility?: 'public' | 'private';
  // Follow request status for private profiles
  is_following?: boolean;
  has_pending_request?: boolean;
  request_status?: 'pending' | 'approved' | 'rejected' | null;
}

export interface FollowStatus {
  is_following: boolean;
  is_following_me: boolean;
  has_pending_request: boolean;
}

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_visibility: 'public' | 'private' | null;
  location?: string | null;
  website?: string | null;
  social_links?: Record<string, unknown> | null;
  has_completed_onboarding?: boolean;
  created_at: string;
}

export interface UserCollection {
  id: string;
  user_id: string;
  strain_id: string;
  user_notes: string | null;
  batch_info: string | null;
  user_image_url: string | null;
  user_thc_percent: number | null;
  user_cbd_percent: number | null;
  created_at: string;
  updated_at: string;
}
