import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { ALL_BADGES } from "@/lib/badges";

export async function POST(request: Request) {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const { featuredBadges } = await request.json();

    if (!Array.isArray(featuredBadges)) {
        return jsonError("featuredBadges must be an array", 400);
    }

    if (featuredBadges.length > 4) {
        return jsonError("Maximum 4 featured badges", 400);
    }

    const { data: unlockedBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id);

    const unlockedSet = new Set(unlockedBadges?.map(b => b.badge_id) || []);

    for (const badgeId of featuredBadges) {
        if (!unlockedSet.has(badgeId)) {
            return jsonError(`Badge ${badgeId} not unlocked`, 400);
        }
        if (!ALL_BADGES.find(b => b.id === badgeId)) {
            return jsonError(`Invalid badge ${badgeId}`, 400);
        }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ featured_badges: featuredBadges })
        .eq('id', user.id);

    if (error) {
        return jsonError(error.message, 500, error.code);
    }

    return jsonSuccess({ success: true });
}
