"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loader2, ArrowRight } from "lucide-react";
import { Strain } from "@/lib/types";
import { OnboardingGuide } from "@/components/onboarding/onboarding-guide";
import Link from "next/link";
import { normalizeCollectionSource } from "@/lib/strain-display";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const [isFlipped, setIsFlipped] = useState(false);

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
    <main className="min-h-screen bg-[#0e0e0f] text-white pb-32 overflow-hidden selection:bg-[#00F5FF]/30">
      {/* Ambient neon glow background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00F5FF]/8 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#2FF801]/6 blur-[180px] rounded-full animate-pulse [animation-delay:3s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#a1faff]/5 blur-[200px] rounded-full" />
      </div>

      <div className="relative mx-auto w-full px-4 pt-12 flex flex-col gap-10">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none font-display text-white hover:text-[#00F5FF] transition-colors duration-500 neon-text-cyan">
                CannaLog
              </h1>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute inset-0 bg-[#00F5FF]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-14 h-14 relative rounded-2xl glass-surface border border-[#484849]/50 flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500 overflow-hidden">
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
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <div className="relative">
              <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
              <div className="absolute inset-0 blur-xl bg-[#00F5FF]/30 animate-pulse" />
            </div>
            <p className="text-[11px] font-black text-[#adaaab] uppercase tracking-[0.3em] animate-pulse">
              System wird initialisiert...
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {/* Strain of the Day Section - Full Width Hero */}
            <section className="flex flex-col gap-5">
              <div className="flex items-center gap-4 px-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#484849]" />
                <h2 className="text-[11px] font-black tracking-[0.4em] text-[#00F5FF] uppercase italic font-display">
                  Strain of the Day
                </h2>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#484849]" />
              </div>

              {strainOfTheDay && (
                <Link href={`/strains/${strainOfTheDay.slug}`} className="block">
                  <div className="relative group cursor-pointer">
                    {/* Massive glow effect behind card */}
                    <div className="absolute inset-0 bg-[#00F5FF]/15 blur-[80px] rounded-3xl transform -translate-y-12 opacity-70 group-hover:opacity-100 transition-opacity" />

                    {/* Main card - full width hero */}
                    <div className="relative glass-surface rounded-3xl overflow-hidden border border-[#484849]/30 hover:border-[#00F5FF]/50 transition-all duration-500">
                      {/* Background gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#00F5FF]/5 via-transparent to-[#2FF801]/5 pointer-events-none" />

                      {/* Large Hero Image */}
                      <div className="relative w-full h-[280px] overflow-hidden">
                        {strainOfTheDay.image_url ? (
                          <Image
                            src={strainOfTheDay.image_url}
                            alt={strainOfTheDay.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#1a191b] via-[#262627] to-[#1a191b] flex items-center justify-center">
                            <span className="text-8xl">🌿</span>
                          </div>
                        )}
                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f] via-[#0e0e0f]/40 to-transparent" />

                        {/* Holographic overlay */}
                        <div className="absolute inset-0 card-holo pointer-events-none" />

                        {/* Type badge on image */}
                        <div className="absolute top-4 left-4">
                          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
                            strainOfTheDay.type === 'sativa' ? 'bg-[#adff00]/30 text-[#adff00] border border-[#adff00]/50' :
                            strainOfTheDay.type === 'indica' ? 'bg-[#cb00ff]/30 text-[#cb00ff] border border-[#cb00ff]/50' :
                            'bg-[#00a3ff]/30 text-[#00a3ff] border border-[#00a3ff]/50'
                          }`}>
                            {strainOfTheDay.type}
                          </span>
                        </div>

                        {/* THC badge on image */}
                        <div className="absolute top-4 right-4">
                          <span className="px-4 py-1.5 rounded-full bg-[#0e0e0f]/80 backdrop-blur-md text-[#00F5FF] text-sm font-black uppercase tracking-wider border border-[#00F5FF]/30">
                            {strainOfTheDay.thc_max || '?'}% THC
                          </span>
                        </div>

                        {/* Brand at bottom of image */}
                        <div className="absolute bottom-4 left-4">
                          <span className="px-3 py-1 rounded-full bg-[#2FF801]/20 text-[#2FF801] text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-[#2FF801]/30">
                            {strainOfTheDay.brand || 'Unknown'}
                          </span>
                        </div>
                      </div>

                      {/* Content below image */}
                      <div className="relative p-6 -mt-2">
                        <h3 className="text-3xl font-black uppercase tracking-tight font-display text-white leading-tight mb-3">
                          {strainOfTheDay.name}
                        </h3>

                        {/* Terpenes */}
                        {strainOfTheDay.terpenes && strainOfTheDay.terpenes.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {strainOfTheDay.terpenes.slice(0, 4).map((t, i) => (
                              <span key={i} className="px-3 py-1 rounded-full bg-[#1a191b] border border-[#484849]/50 text-[#adaaab] text-[10px] font-bold uppercase tracking-wider">
                                {typeof t === 'string' ? t : t.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Effects & Flavors */}
                        <div className="flex gap-4 text-[11px] text-[#adaaab]">
                          {strainOfTheDay.effects && strainOfTheDay.effects.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[#2FF801]">●</span>
                              <span>{strainOfTheDay.effects.slice(0, 2).join(', ')}</span>
                            </div>
                          )}
                          {strainOfTheDay.flavors && strainOfTheDay.flavors.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[#00F5FF]">●</span>
                              <span>{strainOfTheDay.flavors.slice(0, 2).join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Tap hint */}
                        <div className="flex items-center justify-center gap-2 mt-6 text-[#00F5FF]">
                          <div className="w-2 h-2 rounded-full bg-[#00F5FF] animate-pulse" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">
                            Tippe für Details
                          </p>
                          <div className="w-2 h-2 rounded-full bg-[#00F5FF] animate-pulse [animation-delay:0.5s]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </section>

            {/* Quick Actions */}
            <section className="flex flex-col gap-4 px-2">
              <Link href="/collection" className="block">
                <button className="relative w-full h-24 group overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
                  {/* Gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00F5FF]/20 via-[#00F5FF]/10 to-[#2FF801]/20 transition-all duration-500 group-hover:from-[#00F5FF]/30 group-hover:via-[#00F5FF]/20 group-hover:to-[#2FF801]/30" />

                  {/* Neon border glow on hover */}
                  <div className="absolute inset-0 rounded-2xl border border-[#484849]/50 group-hover:border-[#00F5FF]/50 transition-all duration-500" />

                  {/* Glow orb */}
                  <div className="absolute top-0 right-8 w-32 h-32 bg-[#00F5FF]/20 rounded-full blur-2xl transform -translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />

                  {/* Content */}
                  <div className="relative flex items-center justify-between px-8 h-full">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-white text-lg font-black uppercase tracking-tighter italic font-display">
                        Meine Sammlung
                      </span>
                      <span className="text-[#adaaab] text-[9px] font-semibold uppercase tracking-widest">
                        {isDemoMode ? "Demo Mode Active" : "Straindaten verwalten"}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#00F5FF]/20 flex items-center justify-center group-hover:bg-[#00F5FF]/40 transition-all duration-500 group-hover:scale-110">
                      <ArrowRight className="text-[#00F5FF] group-hover:translate-x-1 transition-transform" size={24} />
                    </div>
                  </div>
                </button>
              </Link>

              <div className="grid grid-cols-2 gap-4">
                <Link href="/discover" className="block">
                  <button className="relative w-full h-20 group overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="absolute inset-0 bg-[#2FF801]/10 transition-all duration-500 group-hover:bg-[#2FF801]/20" />
                    <div className="absolute inset-0 rounded-2xl border border-[#484849]/50 group-hover:border-[#2FF801]/50 transition-all duration-500" />
                    <div className="relative flex items-center gap-3 px-6 h-full">
                      <div className="w-10 h-10 rounded-xl bg-[#2FF801]/20 flex items-center justify-center">
                        <span className="text-lg">🔍</span>
                      </div>
                      <span className="text-white text-sm font-bold uppercase tracking-tight font-display">
                        Entdecken
                      </span>
                    </div>
                  </button>
                </Link>

                <Link href="/grows" className="block">
                  <button className="relative w-full h-20 group overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="absolute inset-0 bg-[#a1faff]/10 transition-all duration-500 group-hover:bg-[#a1faff]/20" />
                    <div className="absolute inset-0 rounded-2xl border border-[#484849]/50 group-hover:border-[#a1faff]/50 transition-all duration-500" />
                    <div className="relative flex items-center gap-3 px-6 h-full">
                      <div className="w-10 h-10 rounded-xl bg-[#a1faff]/20 flex items-center justify-center">
                        <span className="text-lg">🌱</span>
                      </div>
                      <span className="text-white text-sm font-bold uppercase tracking-tight font-display">
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
