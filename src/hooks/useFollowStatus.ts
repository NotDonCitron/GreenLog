"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import type { FollowStatus } from "@/lib/types";

export function useFollowStatus(userId: string, profileVisibility?: "public" | "private" | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['follow-status', userId] as const,
    queryFn: async (): Promise<FollowStatus & { isPrivate: boolean }> => {
      let currentIsPrivate = profileVisibility === "private";
      if (profileVisibility === undefined) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_visibility")
          .eq("id", userId)
          .single();
        if (profile) {
          currentIsPrivate = profile.profile_visibility === "private";
        }
      }

      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", userId)
        .single();

      let hasPending = false;
      if (currentIsPrivate || profileVisibility === "private") {
        const { data: requestData } = await supabase
          .from("follow_requests")
          .select("id, status")
          .eq("requester_id", user!.id)
          .eq("target_id", userId)
          .eq("status", "pending")
          .single();
        hasPending = !!requestData;
      }

      return {
        is_following: !!followData,
        is_following_me: false,
        has_pending_request: hasPending,
        isPrivate: currentIsPrivate,
      };
    },
    enabled: !!user && !profileVisibility,
    staleTime: 30 * 1000,
  });
}
