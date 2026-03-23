export interface Terpene {
  name: string;
  percent?: number;
}

export interface Strain {
  id: string;
  name: string;
  slug: string;
  type: 'indica' | 'sativa' | 'hybrid' | 'ruderalis';
  brand?: string;
  manufacturer?: string;
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
  effects?: string[];
  genetics?: string;
  indications?: string[];
  is_medical?: boolean;
}

export interface Grow {
  id: string;
  user_id: string;
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
}

export interface ProfileIdentity {
  email: string | null;
  username: string;
  displayName: string;
  initials: string;
  avatarUrl?: string | null;
  profileVisibility: 'public' | 'private';
  tagline: string;
}

export interface ProfileFavorite {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  type: Strain['type'] | null;
  thcDisplay: string;
  favoriteRank: number | null;
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
  favorite_rank: number | null;
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

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_visibility: 'public' | 'private' | null;
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
