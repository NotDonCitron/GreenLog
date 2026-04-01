import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { ALL_BADGES, BADGE_CRITERIA } from "@/lib/badges";
import type { BadgeContext } from "@/lib/badges";

export async function POST() {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const { data: unlockedBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id);

    const unlockedSet = new Set(unlockedBadges?.map(b => b.badge_id) || []);
    const newlyUnlocked: string[] = [];

    for (const badge of ALL_BADGES) {
        if (unlockedSet.has(badge.id)) continue;

        const criteriaFn = BADGE_CRITERIA[badge.criteriaKey];
        if (!criteriaFn) continue;

        try {
            const qualifies = await criteriaFn({ supabase: supabase as BadgeContext['supabase'], userId: user.id });
            if (qualifies) {
                const { error } = await supabase
                    .from('user_badges')
                    .insert({ user_id: user.id, badge_id: badge.id });

                if (!error) {
                    newlyUnlocked.push(badge.id);
                    unlockedSet.add(badge.id);
                }
            }
        } catch (err) {
            console.error(`Error checking badge ${badge.id}:`, err);
        }
    }

    return jsonSuccess({
        newlyUnlocked,
        totalUnlocked: unlockedSet.size
    });
}
