"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"

async function fetchStreakCount(userId: string): Promise<number> {
  // Count distinct days with at least one activity in the last 30 days
  const { data } = await supabase
    .from("user_activities")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  if (!data) return 0

  // Group by day (YYYY-MM-DD) and count days
  const days = new Set(data.map((a) => a.created_at.split("T")[0]))
  return days.size
}

export function StatsBar() {
  const { user } = useAuth()

  const { data: strainCount = 0 } = useQuery({
    queryKey: ["collection-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_collection")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
      return count ?? 0
    },
    enabled: !!user,
  })

  const { data: ratingCount = 0 } = useQuery({
    queryKey: ["rating-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("ratings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
      return count ?? 0
    },
    enabled: !!user,
  })

  const { data: streak = 0 } = useQuery({
    queryKey: ["streak-count", user?.id],
    queryFn: () => fetchStreakCount(user!.id),
    enabled: !!user,
  })

  return (
    <div className="flex items-center justify-center gap-3 text-sm text-zinc-400 py-2 border-b border-white/5">
      <span>{strainCount} Strains</span>
      <span className="text-zinc-600">|</span>
      <span>{ratingCount} Bewertungen</span>
      <span className="text-zinc-600">|</span>
      <span className="text-orange-400">
        {streak}🔥 Streak
      </span>
    </div>
  )
}