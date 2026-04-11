"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { MatchResult } from "@/lib/types";
import Link from "next/link";

export function TopMatchesSection() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    async function fetchTopMatches() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/recommendations/top?limit=5");
        const json = await res.json();
        if (json.data?.matches?.length > 0) {
          setMatches(json.data.matches);
          setRatingCount(json.data.ratingCount || 0);
        }
      } catch (e) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchTopMatches();
  }, []);

  if (loading || matches.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Deine Top-Matches (Algorithmus-basiert)
        </h2>
        <span className="text-xs text-[var(--muted-foreground)]">
          Basierend auf {ratingCount} Bewertungen
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {matches.map((match) => (
          <Link
            key={match.strainId}
            href={`/strains/${match.strainSlug}`}
            className="group relative"
          >
            <div className="aspect-[3/4] rounded-lg bg-[var(--muted)] border border-[var(--border)] overflow-hidden">
              {/* Strain Image Placeholder */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-sm font-medium truncate">{match.strainName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {match.score}% Übereinstimmung
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}