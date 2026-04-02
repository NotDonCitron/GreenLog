// src/hooks/useCollection.ts
"use client";

import { useCallback } from "react";
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

  // Supabase returns `any[]` from the typed select, so we assert once to the correct row type
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

async function fetchCollectionIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_collection")
    .select("strain_id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { strain_id: string }) => r.strain_id);
}

export function useCollection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const collectionQuery = useQuery({
    queryKey: ["collection", user?.id],
    queryFn: () => fetchFullCollection(user!.id),
    enabled: !!user,
  });

  const idsQuery = useQuery({
    queryKey: ["collection-ids", user?.id],
    queryFn: () => fetchCollectionIds(user!.id),
    enabled: !!user,
  });

  const sharedCallbacks = {
    onMutate: async (strainId: string, optimisticUpdate: (old: string[] | undefined) => string[] | undefined) => {
      await queryClient.cancelQueries({ queryKey: ["collection-ids", user?.id] });
      const previousIds = queryClient.getQueryData<string[]>(["collection-ids", user?.id]);
      queryClient.setQueryData<string[]>(["collection-ids", user?.id], optimisticUpdate);
      return { previousIds };
    },
    onError: (_err: Error, _vars: unknown, context: { previousIds?: string[] } | undefined) => {
      if (context?.previousIds) {
        queryClient.setQueryData<string[]>(["collection-ids", user?.id], context.previousIds);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["collection-ids", user?.id] });
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
    },
    onMutate: async ({ strainId }) => sharedCallbacks.onMutate(strainId, (old) => {
      if (!old) return old;
      return [...new Set([...old, strainId])];
    }),
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
    onMutate: async ({ strainId }) => sharedCallbacks.onMutate(strainId, (old) => {
      if (!old) return old;
      return old.filter((id) => id !== strainId);
    }),
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
      const ids = idsQuery.data ?? [];
      if (ids.includes(strainId)) {
        await uncollectMutation.mutateAsync({ strainId });
      } else {
        await collectMutation.mutateAsync({ strainId, opts });
      }
    },
    [idsQuery.data, collectMutation, uncollectMutation]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["collection", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["collection-ids", user?.id] });
  }, [queryClient, user?.id]);

  return {
    collectedIds: idsQuery.data ?? [],
    collection: collectionQuery.data ?? [],
    isLoading: collectionQuery.isLoading || idsQuery.isLoading,
    error: collectionQuery.error ?? idsQuery.error,
    count: idsQuery.data?.length ?? 0,
    collect,
    uncollect,
    toggleCollect,
    refetch,
  };
}
