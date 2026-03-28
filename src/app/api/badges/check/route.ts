import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ALL_BADGES, BADGE_CRITERIA } from "@/lib/badges";
import { BadgeContext } from "@/lib/badges";

export async function POST() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's currently unlocked badges
  const { data: unlockedBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id);

  const unlockedSet = new Set(unlockedBadges?.map(b => b.badge_id) || []);
  const newlyUnlocked: string[] = [];

  // Check each badge criteria
  for (const badge of ALL_BADGES) {
    if (unlockedSet.has(badge.id)) continue; // Already unlocked

    const criteriaFn = BADGE_CRITERIA[badge.criteriaKey];
    if (!criteriaFn) continue;

    try {
      const qualifies = await criteriaFn({ supabase: supabase as BadgeContext['supabase'], userId: user.id });
      if (qualifies) {
        // Insert new badge
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

  return NextResponse.json({
    newlyUnlocked,
    totalUnlocked: unlockedSet.size
  });
}