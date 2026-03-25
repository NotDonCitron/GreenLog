"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loader2, ArrowRight } from "lucide-react";
import { Strain } from "@/lib/types";
import { CollectionStack } from "@/components/home/collection-stack";
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
    effects: ["Energy"],
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
        // 1. Strain of the Day (Pseudo-zufällig basierend auf dem Datum)
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
    <main className="min-h-screen bg-[#355E3B] text-white pb-32 overflow-hidden selection:bg-[#00F5FF]/30">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#2FF801]/10 blur-[150px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      <div className="relative mx-auto max-w-lg px-6 pt-10 flex flex-col gap-12">
        {/* Refined Header */}
        <header className="flex justify-between items-center group">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none group-hover:text-[#00F5FF] transition-colors duration-500">
              CannaLog
            </h1>
          </div>
          <div className="w-14 h-14 relative p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl transform group-hover:rotate-6 transition-transform duration-500">
            <Image 
              src="/logo.png" 
              alt="CannaLog Logo" 
              fill
              className="object-contain p-1"
              priority
            />
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <div className="relative">
              <Loader2 className="animate-spin text-[#00F5FF]" size={48} />
              <div className="absolute inset-0 blur-xl bg-[#00F5FF]/20 animate-pulse" />
            </div>
            <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em] animate-pulse">
              System wird initialisiert...
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {/* Featured Section: Strain of the Day */}
            <section className="flex flex-col gap-6">
              <div className="flex items-center gap-4 px-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <h2 className="text-[11px] font-black tracking-[0.4em] text-[#00F5FF] uppercase italic">
                  Strain of the Day
                </h2>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>
              
              {strainOfTheDay && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-[#00F5FF]/5 blur-3xl rounded-full transform -translate-y-12 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <CollectionStack
                    strains={[strainOfTheDay]}
                    activeIndex={0}
                    isFlipped={isFlipped}
                    setIsFlipped={setIsFlipped}
                    handleSwipe={() => { }} 
                    nextCard={() => { }}
                    prevCard={() => { }}
                  />
                </div>
              )}
              
              <div className="flex items-center justify-center gap-3 pt-2">
                <div className="w-1 h-1 rounded-full bg-[#00F5FF] animate-pulse" />
                <p className="text-[9px] text-white/30 uppercase font-black tracking-[0.25em]">
                  Tippe auf die Karte für Details
                </p>
                <div className="w-1 h-1 rounded-full bg-[#00F5FF] animate-pulse [animation-delay:0.5s]" />
              </div>
            </section>

            {/* Quick Actions / Navigation */}
            <section className="flex flex-col gap-6 px-2">
              <Link href="/collection">
                <button className="relative w-full h-24 group overflow-hidden rounded-[2rem] transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
                  {/* Button Background */}
                  <div className="absolute inset-0 bg-white transition-colors duration-500 group-hover:bg-[#2FF801]" />
                  
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                  
                  {/* Content */}
                  <div className="relative flex items-center justify-between px-10 h-full">
                    <div className="flex flex-col items-start">
                      <span className="text-black text-lg font-black uppercase tracking-tighter italic">
                        Meine Sammlung
                      </span>
                      <span className="text-black/40 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                        {isDemoMode ? "Demo Mode Active" : "Einträge ansehen"}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black transition-colors duration-500">
                      <ArrowRight className="text-black group-hover:text-white transition-all group-hover:translate-x-1" size={24} />
                    </div>
                  </div>
                </button>
              </Link>
            </section>
          </div>
        )}
      </div>
      <BottomNav />
      <OnboardingGuide />
    </main>
  );
}
