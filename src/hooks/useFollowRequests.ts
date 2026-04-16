"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { followRequestsKeys } from "@/lib/query-keys";

export function useFollowRequests() {
  return useQuery({
    queryKey: followRequestsKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_requests")
        .select("id, requester_id, target_id, status, created_at")
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });
}
