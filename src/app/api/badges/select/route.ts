import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ALL_BADGES } from "@/lib/badges";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { featuredBadges } = await request.json();

  // Validate
  if (!Array.isArray(featuredBadges)) {
    return NextResponse.json({ error: "featuredBadges must be an array" }, { status: 400 });
  }

  if (featuredBadges.length > 4) {
    return NextResponse.json({ error: "Maximum 4 featured badges" }, { status: 400 });
  }

  // Verify all badges are unlocked by user
  const { data: unlockedBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id);

  const unlockedSet = new Set(unlockedBadges?.map(b => b.badge_id) || []);

  for (const badgeId of featuredBadges) {
    if (!unlockedSet.has(badgeId)) {
      return NextResponse.json({ error: `Badge ${badgeId} not unlocked` }, { status: 400 });
    }
    if (!ALL_BADGES.find(b => b.id === badgeId)) {
      return NextResponse.json({ error: `Invalid badge ${badgeId}` }, { status: 400 });
    }
  }

  // Update profiles
  const { error } = await supabase
    .from('profiles')
    .update({ featured_badges: featuredBadges })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}