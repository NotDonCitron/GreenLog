import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

// GET /api/gdpr/export - Get data export for current user (synchronous, full data)
export async function GET(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
  const { user, supabase } = auth;

  // Fetch all user data in parallel from all tables
  const [
    profileResult,
    followingResult,
    followersResult,
    followRequestsSentResult,
    followRequestsReceivedResult,
    activitiesResult,
    ratingsResult,
    userStrainRelationsResult,
    userBadgesResult,
    userCollectionResult,
    consentsResult,
    growsResult,
    plantsResult,
    growEntriesResult,
    growRemindersResult,
    consumptionLogsResult,
    pushSubscriptionsResult,
  ] = await Promise.all([
    // Profile
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),

    // Follows (where user is follower)
    supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id),

    // Follows (where user is being followed)
    supabase
      .from('follows')
      .select('*')
      .eq('following_id', user.id),

    // Follow requests sent
    supabase
      .from('follow_requests')
      .select('*')
      .eq('requester_id', user.id),

    // Follow requests received
    supabase
      .from('follow_requests')
      .select('*')
      .eq('target_id', user.id),

    // User activities
    supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    // Ratings
    supabase
      .from('ratings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    // User strain relations (favorites, wishlist)
    supabase
      .from('user_strain_relations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    // User badges
    supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false }),

    // User collection notes
    supabase
      .from('user_collection')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    // User consents
    supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id),

    supabase
      .from('grows')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('plants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('grow_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('grow_reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('consumption_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id),
  ]);

  // Check for errors (profile is critical)
  if (profileResult.error) {
    return jsonError("Failed to export profile data", 500);
  }

  const exportData = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    profile: profileResult.data,
    social: {
      following: followingResult.data || [],
      followers: followersResult.data || [],
      follow_requests_sent: followRequestsSentResult.data || [],
      follow_requests_received: followRequestsReceivedResult.data || [],
    },
    activities: activitiesResult.data || [],
    strains: {
      ratings: ratingsResult.data || [],
      favorites: (userStrainRelationsResult.data || []).filter(r => r.is_favorite),
      wishlist: (userStrainRelationsResult.data || []).filter(r => r.is_wishlist),
      collection_notes: userCollectionResult.data || [],
    },
    gamification: {
      badges: userBadgesResult.data || [],
    },
    privacy: {
      consents: consentsResult.data || [],
      push_subscriptions: pushSubscriptionsResult.data || [],
    },
    grows: {
      grows: growsResult.data || [],
      plants: plantsResult.data || [],
      grow_entries: growEntriesResult.data || [],
      grow_reminders: growRemindersResult.data || [],
    },
    consumption: {
      consumption_logs: consumptionLogsResult.data || [],
    },
    // Note: Organization memberships are NOT included in GDPR export
    // because they contain data controlled by the organization (Club), not the user
    // Users should contact the organization directly for their data
  };

  return jsonSuccess(exportData);
}
