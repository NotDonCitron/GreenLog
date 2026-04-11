"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

interface MatchScoreBadgeProps {
  strainId: string;
  strainName: string;
}

export function MatchScoreBadge({ strainId, strainName }: MatchScoreBadgeProps) {
  const { user, session } = useAuth();
  const [score, setScore] = useState<number | null>(null);
  const [basedOn, setBasedOn] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // session.access_token muss auch vorhanden sein (wird asynchron gesetzt)
    if (!user || !session?.access_token) {
      setLoading(false);
      return;
    }

    async function fetchMatch() {
      try {
        const accessToken = session.access_token;
        const res = await fetch(`/api/recommendations/match?strain_id=${strainId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
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
  }, [strainId, user, session]);

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