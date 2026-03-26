"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { Strain } from "@/lib/types";
import { OnboardingGuide } from "@/components/onboarding/onboarding-guide";
import Link from "next/link";
import { normalizeCollectionSource } from "@/lib/strain-display";

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

      <div className="relative mx-auto max-w-lg px-6 pt-12 flex flex-col gap-10">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none font-display text-white hover:text-[#00F5FF] transition-colors duration-500 neon-text-cyan">
              CannaLog
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#adaaab]">
              Neon Vault Edition
            </p>
          </div>
          <div className="relative group">
            <div className="absolute inset-0 bg-[#00F5FF]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-14 h-14 relative rounded-2xl glass-surface border border-[#484849]/50 flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00F5FF] to-[#2FF801] flex items-center justify-center">
                <span className="text-black font-black text-sm">CL</span>
              </div>
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
            {/* Strain of the Day Section */}
            <section className="flex flex-col gap-5">
              <div className="flex items-center gap-4 px-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#484849]" />
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-[#00F5FF]" />
                  <h2 className="text-[11px] font-black tracking-[0.4em] text-[#00F5FF] uppercase italic font-display">
                    Strain of the Day
                  </h2>
                  <Sparkles size={12} className="text-[#00F5FF]" />
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#484849]" />
              </div>

              {strainOfTheDay && (
                <Link href={`/strains/${strainOfTheDay.slug}`} className="block">
                  <div className="relative group cursor-pointer">
                    {/* Glow effect behind card */}
                    <div className="absolute inset-0 bg-[#00F5FF]/10 blur-3xl rounded-3xl transform -translate-y-6 opacity-60 group-hover:opacity-100 transition-opacity" />

                    {/* Main card */}
                    <div className="relative glass-surface rounded-3xl p-6 border border-[#484849]/30 hover:border-[#00F5FF]/50 transition-all duration-500 group-hover:scale-[1.02]">
                      {/* Holo accent line */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#00F5FF]/10 via-transparent to-[#2FF801]/10 pointer-events-none" />

                      {/* Card content */}
                      <div className="relative flex gap-5">
                        {/* Strain image placeholder */}
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1a191b] to-[#262627] border border-[#484849]/50 flex items-center justify-center overflow-hidden shrink-0">
                          {strainOfTheDay.image_url ? (
                            <Image
                              src={strainOfTheDay.image_url}
                              alt={strainOfTheDay.name}
                              width={96}
                              height={96}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#00F5FF]/20 to-[#2FF801]/20 flex items-center justify-center">
                              <span className="text-3xl">🌿</span>
                            </div>
                          )}
                          {/* Holographic overlay */}
                          <div className="absolute inset-0 card-holo rounded-2xl pointer-events-none" />
                        </div>

                        {/* Strain info */}
                        <div className="flex-1 flex flex-col justify-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-[#2FF801]/20 text-[#2FF801] text-[9px] font-black uppercase tracking-wider">
                              {strainOfTheDay.brand || 'Unknown'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              strainOfTheDay.type === 'sativa' ? 'bg-[#adff00]/20 text-[#adff00]' :
                              strainOfTheDay.type === 'indica' ? 'bg-[#cb00ff]/20 text-[#cb00ff]' :
                              'bg-[#00a3ff]/20 text-[#00a3ff]'
                            }`}>
                              {strainOfTheDay.type}
                            </span>
                          </div>
                          <h3 className="text-lg font-black uppercase tracking-tight font-display text-white leading-tight">
                            {strainOfTheDay.name}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-[#00F5FF]/20 text-[#00F5FF] text-xs font-bold neon-text-cyan">
                              {strainOfTheDay.thc_max || '?'}% THC
                            </span>
                            {strainOfTheDay.terpenes && strainOfTheDay.terpenes.length > 0 && (
                              <span className="text-[10px] text-[#adaaab] font-medium truncate">
                                {strainOfTheDay.terpenes.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tap hint */}
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#0e0e0f] border border-[#484849]/50 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-1 h-1 rounded-full bg-[#00F5FF] animate-pulse" />
                        <p className="text-[8px] font-bold uppercase tracking-widest text-[#adaaab]">
                          Tippe für Details
                        </p>
                        <div className="w-1 h-1 rounded-full bg-[#00F5FF] animate-pulse [animation-delay:0.5s]" />
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

            {/* Stats preview */}
            <section className="glass-surface rounded-2xl p-5 border border-[#484849]/30">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#2FF801] animate-pulse" />
                  <span className="text-[#adaaab] text-xs font-medium uppercase tracking-wider">
                    System Status
                  </span>
                </div>
                <span className="text-[#2FF801] text-xs font-bold">
                  {isDemoMode ? 'DEMO' : 'ONLINE'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-black font-display text-[#00F5FF]">42</p>
                  <p className="text-[9px] text-[#adaaab] uppercase tracking-wider">Strains</p>
                </div>
                <div>
                  <p className="text-2xl font-black font-display text-[#2FF801]">3</p>
                  <p className="text-[9px] text-[#adaaab] uppercase tracking-wider">Grows</p>
                </div>
                <div>
                  <p className="text-2xl font-black font-display text-[#a1faff]">89</p>
                  <p className="text-[9px] text-[#adaaab] uppercase tracking-wider">Follower</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
