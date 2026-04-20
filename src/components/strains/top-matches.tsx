"use client";

import { useEffect, useState } from "react";
import { StrainCard } from "./strain-card";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";

interface TopMatch {
  strainId: string;
  strainName: string;
  strainSlug: string;
  score: number;
  basedOnRatings: number;
}

const TOP_MATCHES_COLLAPSE_STORAGE_KEY = "greenlog:collection:top-matches-collapsed";

export function TopMatches() {
  const { user, session } = useAuth();
  const [matches, setMatches] = useState<TopMatch[]>([]);
  const [strains, setStrains] = useState<Record<string, Strain>>({});
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasLoadedCollapsePreference, setHasLoadedCollapsePreference] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsCollapsed(false);
      setHasLoadedCollapsePreference(false);
      return;
    }

    setHasLoadedCollapsePreference(false);
    try {
      const storageKey = `${TOP_MATCHES_COLLAPSE_STORAGE_KEY}:${user.id}`;
      const persisted = window.localStorage.getItem(storageKey);
      setIsCollapsed(persisted === "1");
    } catch {
      // Ignore storage errors (private mode, blocked storage).
      setIsCollapsed(false);
    } finally {
      setHasLoadedCollapsePreference(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !hasLoadedCollapsePreference) return;

    try {
      const storageKey = `${TOP_MATCHES_COLLAPSE_STORAGE_KEY}:${user.id}`;
      window.localStorage.setItem(storageKey, isCollapsed ? "1" : "0");
    } catch {
      // Ignore storage errors.
    }
  }, [user, isCollapsed, hasLoadedCollapsePreference]);

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
    // No matches yet — user needs to rate some strains first
    return (
      <section className="mb-6 relative">
        <div className="flex items-center justify-between mb-3 px-2">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
              Für dich empfohlen
            </h2>
            <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-tight opacity-70">
              Basierend auf deinen Bewertungen
            </p>
          </div>
          <button
            onClick={() => setIsCollapsed(v => !v)}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
            aria-label={isCollapsed ? "Ausklappen" : "Einklappen"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {isCollapsed ? null : (
          <div className="p-6 bg-[var(--card)] rounded-3xl border border-[var(--border)]/50">
            <div className="text-center space-y-2">
              <div className="text-3xl">🌿</div>
              <p className="text-sm font-bold text-[var(--foreground)]">
                Noch keine Empfehlungen
              </p>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed max-w-[240px] mx-auto">
                Bewerte ein paar Sorten mit Sternen — dann erscheinen hier personalisierte Empfehlungen basierend auf deinem Geschmacksprofil.
              </p>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mb-6 relative">
      <div className="flex items-center justify-between mb-3 px-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
            Für dich empfohlen
          </h2>
          <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-tight opacity-70">
            Basierend auf deinen Bewertungen
          </p>
        </div>
        <button
          onClick={() => setIsCollapsed(v => !v)}
          className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
          aria-label={isCollapsed ? "Ausklappen" : "Einklappen"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {isCollapsed ? null : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {matches.map((match, idx) => {
              const strain = strains[match.strainId];
              if (!strain) return null;
              return (
                <div key={match.strainId} className="relative group">
                  <StrainCard strain={strain} index={idx} isCollected={false} />
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md border border-[#2FF801]/40"
                    style={{ backgroundColor: '#2FF80120' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2FF801]" />
                    <span className="text-[10px] font-black tracking-wide text-[#2FF801]">{match.score}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 px-2 text-[9px] text-[var(--muted-foreground)] leading-tight opacity-60">
            Passend zu deinem Geschmacksprofil — basierend auf deinen bisherigen Bewertungen.
          </p>
        </>
      )}
    </section>
  );
}
