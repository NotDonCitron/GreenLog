"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { normalizeCollectionSource } from "@/lib/strain-display";

export default function LandingPage() {
  const [strainOfTheDay, setStrainOfTheDay] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStrainOfTheDay() {
      try {
        const dayOfYear = Math.floor(
          (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
        );
        const { data: allStrains } = await supabase
          .from("strains")
          .select("*")
          .limit(500);

        if (allStrains && allStrains.length > 0) {
          const strain = allStrains[dayOfYear % allStrains.length];
          setStrainOfTheDay({
            ...strain,
            source: normalizeCollectionSource(strain.source),
          } as Strain);
        }
      } catch (err) {
        console.error("Strain of the day error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStrainOfTheDay();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Ambient neon glow background - same as homepage */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[50%] bg-[#00F5FF]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[100%] h-[40%] bg-[#2FF801]/4 blur-[100px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto">
          {/* Logo / Title */}
          <h1 className="text-6xl font-black tracking-tighter uppercase leading-none font-display mb-2">
            Green<span className="text-[#00F5FF]">Log</span>
          </h1>

          {/* Tagline */}
          <p className="text-lg text-[var(--muted-foreground)] mb-8">
            Die professionelle Plattform für Cannabis-Communities
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/login">
              <button className="relative px-8 py-4 h-14 rounded-2xl font-bold uppercase tracking-wide transition-all duration-300 active:scale-[0.98] overflow-hidden group">
                <div className="absolute inset-0 bg-[#00F5FF]" />
                <div className="absolute inset-0 bg-[#00F5FF]/80 group-hover:bg-[#00F5FF] transition-colors" />
                <span className="relative text-black font-display">Jetzt starten</span>
              </button>
            </Link>
            <Link href="/login">
              <button className="relative px-8 py-4 h-14 rounded-2xl font-bold uppercase tracking-wide transition-all duration-300 active:scale-[0.98] overflow-hidden group">
                <div className="absolute inset-0 bg-transparent" />
                <div className="absolute inset-0 rounded-2xl border-2 border-[var(--border)] group-hover:border-[#00F5FF]/50 transition-colors" />
                <span className="relative text-[var(--foreground)] font-display">Mehr erfahren</span>
              </button>
            </Link>
          </div>

          {/* Strain of the Day Card Preview */}
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-[#00F5FF]" size={32} />
              <p className="text-sm text-[var(--muted-foreground)]">Strain des Tages wird geladen...</p>
            </div>
          ) : strainOfTheDay ? (
            <div className="border-2 border-[var(--border)] rounded-2xl p-6 bg-[var(--background)]/50 backdrop-blur-sm max-w-sm mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                Strain des Tages
              </p>
              <p className="text-xl font-black uppercase font-display mb-1">{strainOfTheDay.name}</p>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                {strainOfTheDay.farmer || strainOfTheDay.brand || "Unbekannt"}
              </p>
              <div className="flex gap-4 text-sm">
                <span className="text-[#00F5FF]">THC: {strainOfTheDay.avg_thc || strainOfTheDay.thc_max || "—"}%</span>
                <span className="text-[#2FF801]">CBD: {strainOfTheDay.avg_cbd || strainOfTheDay.cbd_max || "—"}%</span>
              </div>
            </div>
          ) : (
            <div className="border border-[var(--border)] rounded-2xl p-6 bg-[var(--background)]/30 max-w-sm mx-auto">
              <p className="text-sm text-[var(--muted-foreground)]">Strain des Tages nicht verfügbar</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}