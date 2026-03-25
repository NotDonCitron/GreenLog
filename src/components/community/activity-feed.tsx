"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { OrgActivityItem } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { ActivityItem } from "./activity-item";

interface ActivityFeedProps {
  organizationId: string;
}

export function ActivityFeed({ organizationId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<OrgActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      setIsLoading(true);
      setError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          setError("Nicht eingeloggt");
          return;
        }

        const res = await fetch(
          `/api/organizations/${organizationId}/activities?limit=5`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          throw new Error("Fehler beim Laden der Aktivitäten");
        }

        const data = await res.json();
        setActivities(data.activities ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      } finally {
        setIsLoading(false);
      }
    }

    void fetchActivities();
  }, [organizationId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-white/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-xs text-white/40">
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-white/40">
        Noch keine Strain-Aktivitäten
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {activities.map(activity => (
        <ActivityItem key={activity.id} item={activity} />
      ))}
    </div>
  );
}
