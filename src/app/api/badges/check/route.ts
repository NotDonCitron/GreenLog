import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { ALL_BADGES, BADGE_CRITERIA } from "@/lib/badges";
import type { BadgeContext } from "@/lib/badges";

// Get admin client (bypasses RLS) for badge inserts
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing!");
    }
    return import("@supabase/supabase-js").then(m =>
        m.createClient(url, serviceKey, { auth: { persistSession: false } })
    );
}

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
                const adminClient = await getSupabaseAdmin();
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
