"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";
import { StrainCompareGrid } from "@/components/strains/strain-compare-grid";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export function ComparePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slugsParam = searchParams.get("slugs");
    if (!slugsParam) {
      void router.replace("/strains");
      return;
    }

    const slugs = slugsParam.split(",").filter(Boolean).slice(0, 3);
    if (slugs.length < 2) {
      void router.replace("/strains");
      return;
    }

    async function fetchStrains() {
      setLoading(true);
      const { data, error } = await supabase
        .from("strains")
        .select("*")
        .in("slug", slugs);

      if (error) {
        console.error("Compare fetch error:", error);
        setStrains([]);
      } else {
        const strainMap = new Map((data || []).map(s => [s.slug, s]));
        const ordered = slugs.map(slug => strainMap.get(slug)).filter(Boolean) as Strain[];
        setStrains(ordered);
      }
      setLoading(false);
    }

    void fetchStrains();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      {/* Header */}
      <div className="glass-surface border-b border-[var(--border)]/50 px-6 pt-12 pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/strains"
              className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all"
            >
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter font-display">
                Strain Vergleich
              </h1>
              {strains.length > 0 && (
                <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest font-bold">
                  {strains.length} Strain{strains.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
          </div>
        ) : strains.length >= 2 ? (
          <StrainCompareGrid strains={strains} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
              Mindestens 2 Strains nötig
            </p>
            <Link
              href="/strains"
              className="px-6 py-3 bg-[#2FF801] text-black font-bold rounded-xl"
            >
              Strains durchsuchen
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
