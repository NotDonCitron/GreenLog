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
  status: 'active' | 'inactive' | 'pending';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  logo_url?: string | null;
  avatar_url?: string | null;
  description?: string | null;
  requires_member_approval?: boolean;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'gründer' | 'admin' | 'member' | 'viewer' | 'präventionsbeauftragter';
  membership_status: 'active' | 'invited' | 'removed' | 'pending';
  joined_at: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  rejection_reason?: string | null;
  organizations?: Organization | null;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'staff' | 'member' | 'viewer' | 'präventionsbeauftragter';
  token_hash: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export type StrainPublicationStatus = 'draft' | 'review' | 'published' | 'rejected';

export interface Strain {
  id: string;
  name: string;
  slug: string;
  type: 'indica' | 'sativa' | 'hybrid' | 'ruderalis';
  farmer?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  thc_min?: number | null;
  thc_max?: number | null;
  cbd_min?: number | null;
  cbd_max?: number | null;
  avg_thc?: number | null;
  avg_cbd?: number | null;
  image_url?: string | null;
  canonical_image_path?: string | null;
  image_attribution?: {
    source: 'seedbank' | 'wikimedia' | 'linhacanabica' | 'none';
    author?: string;
    license?: string;
    url?: string;
  };
  description?: string;
  terpenes?: (string | Terpene)[];
  flavors?: string[];
  effects?: string[];
  publication_status?: StrainPublicationStatus;
  quality_score?: number;
  primary_source?: string | null;
  source_notes?: string | null;
  reviewed_by?: string;
  reviewed_at?: string;
  // Custom strain fields
  is_custom?: boolean;
  is_medical?: boolean;
  source?: 'pharmacy' | 'street' | 'grow' | 'csc' | 'other';
  created_by?: string;
  created_at?: string;
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
  strain_id?: string | null;
  cover_image_url?: string | null;
  title: string;
  grow_type: 'indoor' | 'outdoor' | 'greenhouse';
  medium?: string | null;
  light_type?: string | null;
  nutrients?: string | null;
  status: 'active' | 'completed' | 'abandoned';
  start_date: string;
  harvest_date?: string | null;
  expected_harvest_date?: string | null;
  yield_grams?: number | null;
  grow_notes?: string | null;
  is_public: boolean;
  created_at?: string;
  strains?: {
    name: string;
    slug?: string;
    image_url?: string | null;
  } | null;
  plants?: Plant[];
  // Joined from explore queries
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export type PlantStatus = 'seedling' | 'vegetative' | 'flowering' | 'flushing' | 'harvested' | 'destroyed';

export interface Plant {
  id: string;
  grow_id: string;
  user_id: string;
  strain_id: string | null;
  plant_name: string;
  status: PlantStatus;
  planted_at: string;
  harvested_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GrowEntryType = 'watering' | 'feeding' | 'note' | 'photo' | 'ph_ec' | 'dli' | 'milestone';

// JSONB content per entry_type
export interface WateringContent { amount_liters: number; }
export interface FeedingContent { nutrient: string; amount: string; ec?: number; }
export interface NoteContent { note_text: string; }
export interface PhotoContent { photo_path: string; signed_photo_url?: string; caption?: string; }
export interface PhEcContent { ph: number; ec: number; }
export interface DliContent { ppfd: number; light_hours: number; dli: number; }
export interface MilestoneContent { milestone_phase: string; notes?: string; }

export interface GrowEntry {
  id: string;
  grow_id: string;
  user_id: string;
  organization_id?: string;
  plant_id?: string | null;
  entry_type?: GrowEntryType | null;
  content?: Record<string, unknown>;
  entry_date?: string;
  day_number?: number;
  title?: string;
  notes?: string;
  image_url?: string;
  height_cm?: number;
  temperature?: number;
  humidity?: number;
  ph_value?: number;
  ec_value?: number;
  water_temperature?: number;
  nutrient_dose?: number;
  created_at: string;
}

export interface GrowMilestone {
  id: string;
  grow_id: string;
  phase: 'germination' | 'vegetation' | 'flower' | 'flush' | 'harvest';
  started_at: string;
  ended_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface GrowPreset {
  id: string;
  name: string;
  grow_mode: 'autoflower' | 'photoperiod';
  light_cycle: string;
  estimated_veg_days: number;
  estimated_flower_days: number;
  ppfd_value?: number | null;
  is_public: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface GrowComment {
  id: string;
  grow_entry_id?: string | null;
  grow_id?: string | null;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: ProfileRow;
}

export interface GrowFollow {
  id: string;
  user_id: string;
  grow_id: string;
  created_at: string;
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

export interface PublicProfilePreferences {
  user_id: string;
  show_badges: boolean;
  show_favorites: boolean;
  show_tried_strains: boolean;
  show_reviews: boolean;
  show_activity_feed: boolean;
  show_follow_counts: boolean;
  default_review_public: boolean;
}

export type PublicProfileBlockKey =
  | "profile"
  | "badges"
  | "favorites"
  | "tried_strains"
  | "reviews"
  | "activity";

export interface PublicProfileBlockState {
  key: PublicProfileBlockKey;
  label: string;
  state: "public" | "private";
  description: string;
}

export interface PublicProfileFavorite {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
}

export interface PublicProfileRating {
  id: string;
  strain_id: string;
  strain_name: string;
  strain_slug: string;
  overall_rating: number;
  public_review_text: string | null;
  created_at: string;
}

export interface SanitizedPublicProfile {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    created_at: string;
  };
  preferences: PublicProfilePreferences;
  blocks: PublicProfileBlockState[];
  counts: {
    followers: number;
    following: number;
    ratings: number;
  };
  badges: ProfileBadge[];
  favorites: PublicProfileFavorite[];
  triedStrains: PublicProfileFavorite[];
  reviews: PublicProfileRating[];
  activities: UserActivity[];
}

export interface ProfileViewModel {
  identity: ProfileIdentity;
  stats: ProfileStats;
  favorites: ProfileFavorite[];
  badges: ProfileBadge[];
  featuredBadgeIds: string[];
  activity: ProfileActivityItem[];
  preview: PublicProfilePreview;
  publicPreferences: PublicProfilePreferences;
  publicBlocks: PublicProfileBlockState[];
}

// Database row types for Supabase
export interface UserStrainRelation {
  user_id: string;
  strain_id: string;
  is_favorite: boolean;
  is_wishlisted: boolean;
  favorite_rank: number | null;
  position: number | null;
  public_status?: "private" | "tried" | "favorite";
  created_at?: string;
}

export interface UserBadge {
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
  is_public: boolean;
  public_review_text?: string | null;
  created_at: string;
}

export type QuickLogEffectChip = "ruhe" | "fokus" | "schlaf" | "kreativitaet" | "appetit";
export type QuickLogSideEffect = "trocken" | "unruhig" | "kopflastig" | "couchlock";
export type QuickLogStatus = "nochmal" | "situativ" | "nicht_nochmal";

export interface ConsumptionLogRow {
  id: string;
  user_id: string;
  strain_id: string | null;
  consumption_method: "vaporizer" | "joint" | "bong" | "pipe" | "edible" | "oil" | "topical" | "other";
  amount_grams: number | null;
  subjective_notes: string | null;
  mood_before: string | null;
  mood_after: string | null;
  consumed_at: string;
  effect_chips: QuickLogEffectChip[];
  side_effects: QuickLogSideEffect[];
  overall_rating: number | null;
  private_status: QuickLogStatus | null;
  private_note: string | null;
  setting_context: string | null;
  created_at: string;
  updated_at: string;
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
  activity_type: 'rating' | 'grow_started' | 'grow_completed' | 'badge_earned' | 'favorite_added' | 'strain_collected' | 'strain_created';
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

export interface SuggestedCommunity {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string | null;
  organization_type: 'club' | 'pharmacy';
  members_count?: number;
  is_following?: boolean;
}

export interface FollowStatus {
  is_following: boolean;
  is_following_me: boolean;
  has_pending_request: boolean;
}

// Community Features Types
export interface CommunityFollower {
  id: string;
  organization_id: string;
  user_id: string;
  created_at: string;
}

export interface CommunityFeedEntry {
  id: string;
  organization_id: string;
  event_type: "strain_created" | "grow_logged" | "rating_added";
  reference_id: string | null;
  user_id: string;
  created_at: string;
  profiles?: ProfileRow;
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
  date_of_birth?: string | null;
  full_name?: string | null;
  created_at: string;
}

export interface UserCollection {
  id?: string;
  user_id: string;
  strain_id: string;
  user_notes: string | null;
  batch_info: string | null;
  user_image_url: string | null;
  user_thc_percent: number | null;
  user_cbd_percent: number | null;
  date_added?: string;
}

export type OrganizationActivityEventType =
  | 'strain_added'
  | 'strain_updated'
  | 'strain_removed'
  | 'member_joined'
  | 'member_removed'
  | 'role_changed'
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_revoked'
  | 'batch_recorded'
  | 'batch_quality_checked'
  | 'cannabis_dispensed'
  | 'batch_destroyed';

export type OrganizationActivityTargetType =
  | 'strain'
  | 'member'
  | 'invite'
  | 'role'
  | 'organization'
  | 'batch';

export interface OrganizationActivity {
  id: string;
  organization_id: string;
  user_id: string | null;
  event_type: OrganizationActivityEventType;
  target_type: OrganizationActivityTargetType | null;
  target_id: string | null;
  target_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined
  user?: ProfileRow;
}

export interface OrganizationActivityResponse {
  activities: OrganizationActivity[];
  total: number;
  has_more: boolean;
}

/**
 * 9-dimensionaler Vektor für Terpen-Matching (KCanG-konform)
 * 4 Leit-Terpene + 5 Cannabinoide
 */
export interface StrainVector {
  myrcen: number;       // 0.0 - 1.0 normalisiert
  limonen: number;
  caryophyllen: number;
  pinen: number;
  thc: number;
  cbd: number;
  cbg: number;
  cbn: number;
  thcv: number;
}

/**
 * User-Präferenz-Vektor, berechnet aus Bewertungen
 */
export interface UserPreferenceVector extends StrainVector {
  ratingCount: number;  // Anzahl der Bewertungen für dieses Profil
}

/**
 * Match-Ergebnis für eine Sorte
 */
export interface MatchResult {
  strainId: string;
  strainName: string;
  strainSlug: string;
  score: number;        // 0-100 (Prozent)
  basedOnRatings: number;
}

// CSC Compliance Types (KCanG § 26)
export interface CscBatch {
  id: string;
  organization_id: string;
  strain_id: string;
  batch_number: string;
  quantity_grams: number;
  thc_percentage: number;
  cbd_percentage: number;
  supplier: string | null;
  received_at: string;
  expiry_date: string | null;
  remaining_grams: number;
  status: 'active' | 'depleted' | 'expired' | 'destroyed';
  recorded_by: string;
  notes: string | null;
  quality_check_passed?: boolean;
  quality_check_notes?: string | null;
  quality_checked_at?: string | null;
  created_at: string;
  updated_at: string;
}

// New hybrid Tier-1 dispensation record (table: `dispensations`).
export interface Tier1Dispensation {
  id: string;
  organization_id: string;
  member_id: string;
  dispensed_by: string;
  grams: number;
  thc_percent: number | null;
  dispensed_at: string;
  created_at: string;
}

export interface Tier1DispensationInsert {
  organization_id: string;
  member_id: string;
  dispensed_by: string;
  grams: number;
  thc_percent?: number | null;
  dispensed_at?: string;
}

// Backward-compatible aliases for existing imports in this branch.
export type CscDispensation = Tier1Dispensation;
export type CscDispensationInsert = Tier1DispensationInsert;

// Legacy CSC inventory dispensation record (table: `csc_dispensations`).
// Kept explicit to avoid confusion with the hybrid Tier-1 dispensations table.
export interface CscInventoryDispensation {
  id: string;
  organization_id: string;
  member_id: string;
  batch_id: string;
  amount_grams: number;
  dispensed_at: string;
  dispensed_by: string;
  reason: string | null;
  created_at: string;
}
export interface CscPreventionConsent {
  id: string;
  organization_id: string;
  member_id: string;
  granted_to_role: 'präventionsbeauftragter';
  data_scopes: string[];
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface CscPreventionConsentInsert {
  organization_id: string;
  member_id: string;
  granted_to_role?: 'präventionsbeauftragter';
  data_scopes?: string[];
  granted_at?: string;
  expires_at?: string | null;
  revoked_at?: string | null;
}

export interface CscDestruction {
  id: string;
  organization_id: string;
  batch_id: string | null;
  amount_grams: number;
  reason: string;
  destroyed_by: string;
  destroyed_at: string;
  witness_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface StrainReport {
  id: string;
  strain_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_key: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: string;
  criteria: Record<string, unknown>;
  created_at: string;
}

// Org community hub stats
export interface OrgStats {
  memberCount: number;
  strainCount: number;
  newestStrain: { id: string; name: string; slug: string } | null;
}

// Org activity feed item
export interface OrgActivityItem {
  id: string;
  type: 'strain_created' | 'rating';
  user: { displayName: string; username: string };
  strain: { id: string; name: string; slug: string };
  rating?: number;
  createdAt: string;
}

// =============================================
// CSC Club Update Posts (V1 admin-only)
// =============================================

export type ClubUpdatePostType =
  | "announcement"
  | "event"
  | "compliance_notice"
  | "documentation_note"
  | "strain_info"
  | "club_info"
  | "system_notice"
  | "poll_notice";

export type ClubUpdateVisibility = "club_only";

export type ClubUpdateModerationStatus = "active" | "hidden" | "removed";

export interface ClubUpdatePost {
  id: string;
  organization_id: string;
  author_id: string;
  post_type: ClubUpdatePostType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  visibility: ClubUpdateVisibility;
  moderation_status: ClubUpdateModerationStatus;
  hidden_at: string | null;
  hidden_by: string | null;
  removed_at: string | null;
  removed_by: string | null;
  created_at: string;
  updated_at: string;
  author?: ProfileRow | null;
}

export interface ClubUpdatePostCreateInput {
  post_type: ClubUpdatePostType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface ClubUpdatePostUpdateInput {
  post_type?: ClubUpdatePostType;
  title?: string;
  body?: string;
  metadata?: Record<string, unknown>;
  moderation_status?: ClubUpdateModerationStatus;
}
