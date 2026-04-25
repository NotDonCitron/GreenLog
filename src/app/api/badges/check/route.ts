import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { ALL_BADGES, BADGE_CRITERIA } from "@/lib/badges";
import type { BadgeContext } from "@/lib/badges";
import { sendPushToUser } from "@/lib/push";

export async function POST(request: Request) {
    const authHeader = request.headers.get("Authorization");
    let supabase;
    if (authHeader) {
        supabase = await getAuthenticatedClient(authHeader.replace("Bearer ", ""));
    } else {
        supabase = await createServerSupabaseClient();
    }

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
                // Use admin client to bypass RLS for badge insert
                const adminClient = getSupabaseAdmin();
                const { error } = await adminClient
                    .from('user_badges')
                    .upsert(
                        { user_id: user.id, badge_id: badge.id },
                        { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
                    );

// Security: The RLS policy on user_badges blocks direct INSERT from authenticated users.
// Badges can only be earned through this API endpoint which:
// 1. Validates criteria server-side via BADGE_CRITERIA functions
// 2. Uses service role client (bypasses RLS)
// 3. Only inserts if criteriaFn returns true
                if (!error) {
                    newlyUnlocked.push(badge.id);
                    unlockedSet.add(badge.id);

                    // Create in-app notification for the badge unlock (best effort)
                    try {
                        await adminClient
                            .from("notifications")
                            .insert({
                                user_id: user.id,
                                title: `Abzeichen freigeschaltet: ${badge.name}`,
                                message: badge.description,
                                type: "badge_unlocked",
                                read: false,
                                data: { badge_id: badge.id, badge_name: badge.name }
                            });
                    } catch (notifErr) {
                        console.error(`[BadgeCheck] Failed to create notification for ${badge.id}:`, notifErr);
                    }

                    // Send push notification (fire and forget)
                    sendPushToUser(adminClient, user.id, {
                        title: `🏆 ${badge.name}`,
                        body: badge.description,
                        tag: `badge_unlocked_${badge.id}`,
                        data: { type: "badge_unlocked", badge_id: badge.id, badge_name: badge.name }
                    }).catch((pushErr: unknown) => {
                        console.error(`[BadgeCheck] Push failed for ${badge.id}:`, pushErr);
                    });
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
