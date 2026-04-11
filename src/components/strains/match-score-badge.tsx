"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface MatchScoreBadgeProps {
  strainId: string;
  strainName: string;
}

export function MatchScoreBadge({ strainId, strainName }: MatchScoreBadgeProps) {
  const [score, setScore] = useState<number | null>(null);
  const [basedOn, setBasedOn] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/recommendations/match?strain_id=${strainId}`);
        const json = await res.json();
        if (json.data?.score !== null) {
          setScore(json.data.score);
          setBasedOn(json.data.basedOnRatings || 0);
        }
      } catch (e) {
        // Silent fail - match score is non-critical
      } finally {
        setLoading(false);
      }
    }

    fetchMatch();
  }, [strainId]);

  if (loading || score === null) {
    return null;
  }

  // Compliance-Wording: Keine werblichen Begriffe
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--muted)] border border-[var(--border)]">
      <span className="text-xs font-medium text-[var(--muted-foreground)]">
        {score}% Profil-Übereinstimmung
      </span>
      <span className="text-[10px] text-[var(--muted-foreground)] opacity-70">
        ({basedOn} Bewertungen)
      </span>
    </div>
  );
}