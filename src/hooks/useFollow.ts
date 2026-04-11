"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { followingKeys, followersKeys } from "@/lib/query-keys";

export function useFollow(targetUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: "follow" | "unfollow" | "request" | "cancel_request") => {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const endpoint = `/api/follow-request/${targetUserId}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { "Authorization": `Bearer ${accessToken}` })
        },
        body: JSON.stringify({ action }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followingKeys.all });
      queryClient.invalidateQueries({ queryKey: followersKeys.all });
    },
  });
}
