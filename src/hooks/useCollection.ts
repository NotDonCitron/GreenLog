"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { emitCollectionUpdate } from "@/lib/collection-events";
import { checkAndUnlockBadges } from "@/lib/badges";
import type { Strain, StrainSource } from "@/lib/types";

export type CollectionStrain = Strain & {
  collected_at?: string | null;
  created_by?: string | null;
  user_notes?: string | null;
  image_url?: string;
  avg_thc?: number;
  avg_cbd?: number;
};

type CollectionRow = {
  batch_info: string | null;
  user_notes: string | null;
  user_thc_percent: number | null;
  user_cbd_percent: number | null;
  user_image_url: string | null;
  date_added: string | null;
  strain: Strain[] | Strain | null;
};

export type CollectOptions = {
  batchInfo?: string;
  userNotes?: string;
  userThc?: number;
  userCbd?: number;
  userImageUrl?: string;
};

async function fetchFullCollection(userId: string): Promise<CollectionStrain[]> {
  const { data, error } = await supabase
    .from("user_collection")
    .select(`
      batch_info,
      user_notes,
      user_thc_percent,
      user_cbd_percent,
      user_image_url,
      date_added,
      strain:strains (*)
    `)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  if (!data) return [];

  const rows = data as CollectionRow[];
  return rows.reduce<CollectionStrain[]>((acc, item) => {
    const rawStrain = Array.isArray(item.strain) ? item.strain[0] : item.strain;
    if (!rawStrain) return acc;

    acc.push({
      ...rawStrain,
      image_url: item.user_image_url || rawStrain.image_url || undefined,
      source: (item.batch_info || rawStrain.source) as StrainSource,
      avg_thc: item.user_thc_percent ?? rawStrain.avg_thc ?? rawStrain.thc_max ?? undefined,
      avg_cbd: item.user_cbd_percent ?? rawStrain.avg_cbd ?? rawStrain.cbd_max ?? undefined,
      user_notes: item.user_notes,
      collected_at: item.date_added,
    });
    return acc;
  }, []);
}

export function useCollection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const collectionQuery = useQuery({
    queryKey: ["collection", user?.id],
    queryFn: () => fetchFullCollection(user!.id),
    enabled: !!user,
  });

  const collectedIds = useMemo(
    () => (collectionQuery.data ?? []).map((s) => s.id),
    [collectionQuery.data]
  );

  const sharedCallbacks = {
    onError: (_err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["collection", user?.id] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", user?.id] });
      emitCollectionUpdate();
      if (user) {
        checkAndUnlockBadges(user.id, supabase).catch(() => {});
      }
    },
  };

  const collectMutation = useMutation({
    mutationFn: async ({ strainId, opts }: { strainId: string; opts?: CollectOptions }) => {
      const { error } = await supabase.from("user_collection").upsert({
        user_id: user!.id,
        strain_id: strainId,
        batch_info: opts?.batchInfo,
        user_notes: opts?.userNotes,
        user_thc_percent: opts?.userThc,
        user_cbd_percent: opts?.userCbd,
        user_image_url: opts?.userImageUrl,
        date_added: new Date().toISOString(),
      }, {
        onConflict: "user_id,strain_id",
      });
      if (error) throw error;

      // Log to user_activities for streak tracking
      await supabase.from("user_activities").insert({
        user_id: user!.id,
        activity_type: "strain_collected",
        target_id: strainId,
        is_public: true,
      });
    },
    onError: sharedCallbacks.onError,
    onSettled: sharedCallbacks.onSettled,
  });

  const uncollectMutation = useMutation({
    mutationFn: async ({ strainId }: { strainId: string }) => {
      const { error } = await supabase
        .from("user_collection")
        .delete()
        .eq("user_id", user!.id)
        .eq("strain_id", strainId);
      if (error) throw error;
    },
    onError: sharedCallbacks.onError,
    onSettled: sharedCallbacks.onSettled,
  });

  const collect = useCallback(
    (strainId: string, opts?: CollectOptions) => collectMutation.mutateAsync({ strainId, opts }),
    [collectMutation]
  );

  const uncollect = useCallback(
    (strainId: string) => uncollectMutation.mutateAsync({ strainId }),
    [uncollectMutation]
  );

  const toggleCollect = useCallback(
    async (strainId: string, opts?: CollectOptions) => {
      if (collectedIds.includes(strainId)) {
        await uncollectMutation.mutateAsync({ strainId });
      } else {
        await collectMutation.mutateAsync({ strainId, opts });
      }
    },
    [collectedIds, collectMutation, uncollectMutation]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["collection", user?.id] });
  }, [queryClient, user?.id]);

  return {
    collectedIds,
    collection: collectionQuery.data ?? [],
    isLoading: collectionQuery.isLoading,
    error: collectionQuery.error,
    count: collectedIds.length,
    collectAction: collect,
    uncollect,
    toggleCollect,
    refetch,
  };
}
