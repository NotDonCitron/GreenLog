"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loader2 } from "lucide-react";
import { Strain } from "@/lib/types";
import Link from "next/link";
import { normalizeCollectionSource } from "@/lib/strain-display";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { StrainCard } from "@/components/strains/strain-card";

const DEMO_SIMULATION_DATA: Strain[] = [
  {
    id: "sim-1",
    name: "Aurora Ghost Train Haze",
    brand: "Aurora",
    slug: "aurora-ghost-train-haze",
    thc_max: 34,
    type: "sativa",
    terpenes: ["Terpinolene", "Myrcene", "Limonene"],
    flavors: ["Zitrus", "Erdig"],
    effects: ["Energy", "Kreativität", "Fokus"],
    image_url: "/strains/aurora-typ-1-island-sweet-skunk.jpg",
    is_medical: true,
    source: "pharmacy",
  }
];

export default function Home() {
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const [strainOfTheDay, setStrainOfTheDay] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHomeData() {
      if (isDemoMode) {
        setStrainOfTheDay(DEMO_SIMULATION_DATA[0]);
        setLoading(false);
        return;
      }

      try {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
        const { data: allStrains } = await supabase.from('strains').select('*').limit(100);
        if (allStrains && allStrains.length > 0) {
          setStrainOfTheDay({
            ...allStrains[dayOfYear % allStrains.length],
            source: normalizeCollectionSource(allStrains[dayOfYear % allStrains.length].source),
          });
        }
      } catch (err) {
        console.error("Home data error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) fetchHomeData();
  }, [user, authLoading, isDemoMode]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24">
      {/* Ambient neon glow background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00F5FF]/8 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#2FF801]/6 blur-[180px] rounded-full animate-pulse [animation-delay:3s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#a1faff]/5 blur-[200px] rounded-full" />
      </div>

      <div className="relative mx-auto w-full px-4 pt-12 flex flex-col gap-6 h-screen overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none font-display text-[var(--foreground)] hover:text-[#00F5FF] transition-colors duration-500 neon-text-cyan">
                CannaLog
              </h1>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute inset-0 bg-[#00F5FF]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-14 h-14 relative rounded-2xl glass-surface border border-[var(--border)]/50 flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500 overflow-hidden">
              <Image
                src="/logo.png"
                alt="CannaLog Logo"
                fill
                className="object-contain p-1.5"
                priority
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
              <div className="absolute inset-0 blur-xl bg-[#00F5FF]/30 animate-pulse" />
            </div>
            <p className="text-[11px] font-black text-[var(--muted-foreground)] uppercase tracking-[0.3em] animate-pulse">
              System wird initialisiert...
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Strain of the Day - Full remaining space */}
            <section className="flex-1 flex flex-col gap-4 min-h-0">
              {strainOfTheDay && (
                <div className="min-h-0 flex items-center justify-center" style={{ height: 'calc(100vh - 340px)' }}>
                  <StrainCard strain={strainOfTheDay} index={0} />
                </div>
              )}

              {/* Quick Actions - Entdecken & Grows */}
              <div className="grid grid-cols-2 gap-4 py-4">
                <Link href="/feed" className="block">
                  <button className="relative w-full h-20 group overflow-hidden rounded-2xl transition-all duration-500 active:scale-[0.98]">
                    <div className="absolute inset-0 bg-[#2FF801]/10 transition-all duration-500 group-hover:bg-[#2FF801]/20" />
                    <div className="absolute inset-0 rounded-2xl border border-[var(--border)]/50 group-hover:border-[#2FF801]/50 transition-all duration-500" />
                    <div className="relative flex items-center gap-3 px-6 h-full">
                      <div className="w-10 h-10 rounded-xl bg-[#2FF801]/20 flex items-center justify-center">
                        <span className="text-lg">🔍</span>
                      </div>
                      <span className="text-[var(--foreground)] text-sm font-bold uppercase tracking-tight font-display">
                        Entdecken
                      </span>
                    </div>
                  </button>
                </Link>

                <Link href="/grows" className="block">
                  <button className="relative w-full h-20 group overflow-hidden rounded-2xl transition-all duration-500 active:scale-[0.98]">
                    <div className="absolute inset-0 bg-[#a1faff]/10 transition-all duration-500 group-hover:bg-[#a1faff]/20" />
                    <div className="absolute inset-0 rounded-2xl border border-[var(--border)]/50 group-hover:border-[#a1faff]/50 transition-all duration-500" />
                    <div className="relative flex items-center gap-3 px-6 h-full">
                      <div className="w-10 h-10 rounded-xl bg-[#a1faff]/20 flex items-center justify-center">
                        <span className="text-lg">🌱</span>
                      </div>
                      <span className="text-[var(--foreground)] text-sm font-bold uppercase tracking-tight font-display">
                        Grows
                      </span>
                    </div>
                  </button>
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
