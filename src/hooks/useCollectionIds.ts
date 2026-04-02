// src/hooks/useCollectionIds.ts
"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { onCollectionUpdate } from "@/lib/collection-events";

async function fetchCollectionIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_collection")
    .select("strain_id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { strain_id: string }) => r.strain_id);
}

export function useCollectionIds() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["collection-ids", user?.id],
    queryFn: () => fetchCollectionIds(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  // Auto-subscribe to refresh on visibility + event bus
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["collection-ids", user.id] });
      }
    };

    const unsubscribe = onCollectionUpdate(() => {
      queryClient.invalidateQueries({ queryKey: ["collection-ids", user.id] });
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribe();
    };
  }, [queryClient, user]);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["collection-ids", user?.id] });
  };

  return {
    collectedIds: query.data ?? [],
    isLoading: query.isLoading,
    refetch,
  };
}
