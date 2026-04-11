// src/components/strains/SimilarStrainsSection.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { StrainCard } from "./strain-card";

interface SimilarStrainsSectionProps {
  strainId: string;
  strainName: string;
}

interface SimilarMatch {
  strainId: string;
  strainName: string;
  strainSlug: string;
  score: number;
}

async function fetchSimilarStrains(strainId: string): Promise<{ matches: SimilarMatch[]; ratingCount: number } | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return null;

  const token = sessionData.session.access_token;
  const res = await fetch(`/api/recommendations/similar?strain_id=${strainId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  const json = await res.json();
  if (!json.data || json.data.matches.length === 0 || json.data.ratingCount < 3) return null;
  return json.data;
}

export function SimilarStrainsSection({ strainId, strainName }: SimilarStrainsSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["similar-strains", strainId],
    queryFn: () => fetchSimilarStrains(strainId),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="w-full py-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-lg">🧬</span>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">Chemische Ähnlichkeit</h3>
            <p className="text-[10px] text-[var(--muted-foreground)]">Sorten mit ähnlichem Profil</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-[160px] h-[200px] rounded-2xl bg-[var(--card)] border border-[var(--border)]/50 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!data || data.matches.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-8">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-lg">🧬</span>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">Chemische Ähnlichkeit</h3>
          <p className="text-[10px] text-[var(--muted-foreground)]">Sorten mit ähnlichem Profil</p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {data.matches.map((match, i) => (
          <div key={match.strainId} className="flex-shrink-0 w-[160px]">
            <StrainCard
              strain={{
                id: match.strainId,
                name: match.strainName,
                slug: match.strainSlug,
              } as import("@/lib/types").Strain}
              index={i}
            />
          </div>
        ))}
      </div>
    </section>
  );
}