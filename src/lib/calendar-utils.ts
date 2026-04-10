import { format } from "date-fns";
import type { CollectionStrain } from "@/hooks/useCollection";

export type ActivityMap = Record<string, number>;

/**
 * Build a map of date -> count from collection items with date_added.
 * Key format: yyyy-MM-dd (matches react-day-picker modifier format)
 */
export function buildActivityMap(collection: CollectionStrain[]): ActivityMap {
  const map: ActivityMap = {};
  for (const item of collection) {
    const dateKey = item.collected_at;
    if (!dateKey) continue;
    const formatted = format(new Date(dateKey), "yyyy-MM-dd");
    map[formatted] = (map[formatted] || 0) + 1;
  }
  return map;
}
