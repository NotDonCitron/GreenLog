"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, ChevronRight } from "lucide-react";
import { StrainCard } from "./strain-card";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";

interface TopMatch {
  strainId: string;
  strainName: string;
  strainSlug: string;
  score: number;
  basedOnRatings: number;
}

export function TopMatches() {
  const { user, session } = useAuth();
  const [matches, setMatches] = useState<TopMatch[]>([]);
  const [strains, setStrains] = useState<Record<string, Strain>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // session.access_token muss auch vorhanden sein (wird asynchron gesetzt)
    if (!user || !session?.access_token) return;

    async function fetchTopMatches() {
      try {
        const res = await fetch("/api/recommendations/top?limit=4", {
          headers: {
            Authorization: `Bearer ${session!.access_token}`
          }
        });
        const json = await res.json();

        if (json.data?.matches && json.data.matches.length > 0) {
          setMatches(json.data.matches);
          
          // Fetch full strain data for the matches
          const strainIds = json.data.matches.map((m: TopMatch) => m.strainId);
          const { data: strainData } = await supabase
            .from("strains")
            .select("*")
            .in("id", strainIds);
          
          if (strainData) {
            const strainMap: Record<string, Strain> = {};
            strainData.forEach((s: any) => {
              strainMap[s.id] = s as Strain;
            });
            setStrains(strainMap);
          }
        }
      } catch (e) {
        console.error("Failed to fetch top matches:", e);
        setError("Fehler beim Laden der Top-Matches");
      } finally {
        setLoading(false);
      }
    }

    fetchTopMatches();
  }, [user, session]);

  if (!user || (loading && matches.length === 0)) {
    return (
      <div className="mb-8 p-6 bg-[var(--card)] rounded-3xl border border-[var(--border)]/50 animate-pulse">
        <div className="h-4 w-48 bg-[var(--muted)] rounded mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-[4/5] bg-[var(--muted)] rounded-2xl" />
          <div className="aspect-[4/5] bg-[var(--muted)] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!loading && matches.length === 0) {
    return null; // Not enough data or no matches
  }

  return (
    <section className="mb-10 relative">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#00F5FF]/10 text-[#00F5FF]">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
              Deine Top-Matches
            </h2>
            <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-tight opacity-70">
              Algorithmus-basiert
            </p>
          </div>
        </div>
        <Link 
          href="/strains?filter=matches" 
          className="text-[10px] font-black uppercase tracking-widest text-[#00F5FF] flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          Alle ansehen <ChevronRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {matches.map((match, idx) => {
          const strain = strains[match.strainId];
          if (!strain) return null;
          
          return (
            <div key={match.strainId} className="relative group">
              <StrainCard strain={strain} index={idx} isCollected={false} />
              <div className="absolute bottom-2 left-2 z-30 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-[#00F5FF]/30 text-[9px] font-black text-[#00F5FF]">
                {match.score}%
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Compliance info */}
      <p className="mt-3 px-2 text-[9px] text-[var(--muted-foreground)] italic leading-tight opacity-50">
        Die Übereinstimmung basiert rein auf der mathematischen Ähnlichkeit der Terpen- und Cannabinoid-Profile zu deinen bisherigen Bewertungen.
      </p>
    </section>
  );
}
