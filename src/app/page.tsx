"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loader2, ArrowRight } from "lucide-react";
import { Strain } from "@/lib/types";
import { CollectionStack } from "@/components/home/collection-stack";
import Link from "next/link";

const DEMO_SIMULATION_DATA: Strain[] = [
  { id: "sim-1", name: "Aurora Ghost Train Haze", brand: "Aurora", slug: "godfather-og", thc_max: 34, type: "sativa", terpenes: ["Terpinolene", "Myrcene", "Limonene"], effects: ["Energy"], image_url: "/strains/godfather-og.jpg", is_medical: true }
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
           setStrainOfTheDay(allStrains[dayOfYear % allStrains.length]);
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
    <main className="min-h-screen bg-[#355E3B] text-white pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_50%)]" />
      
      <div className="relative mx-auto max-w-lg px-6 pt-12 flex flex-col gap-10">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative overflow-hidden rounded-xl bg-white flex items-center justify-center p-1">
              <img src="/logo.png" alt="CannaLog Logo" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <h1 className="text-2xl font-black tracking-widest uppercase italic">CannaLog</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Initialisiere Dashboard...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Strain of the Day als Karte */}
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-black tracking-[0.3em] text-[#00F5FF] uppercase px-2 text-center">Strain of the Day</h2>
              {strainOfTheDay && (
                <CollectionStack 
                  strains={[strainOfTheDay]}
                  activeIndex={0}
                  isFlipped={isFlipped}
                  setIsFlipped={setIsFlipped}
                  handleSwipe={() => {}} // Nur eine Karte, Swipe deaktiviert
                  nextCard={() => {}}
                  prevCard={() => {}}
                />
              )}
            </div>

            {/* Button zur Sammlung */}
            <div className="pt-4 flex flex-col gap-4 px-2">
               <h3 className="text-xl font-black uppercase tracking-tight italic">Journal & Archiv</h3>
               <Link href="/collection">
                 <button className="w-full h-20 bg-white text-black font-black uppercase tracking-[0.2em] rounded-3xl flex items-center justify-between px-8 group hover:bg-[#2FF801] transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    <span className="text-sm">Meine Sammlung</span>
                    <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                 </button>
               </Link>
               <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest text-center">Tippe auf die Karte für Details</p>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
