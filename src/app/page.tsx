"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Strain } from "@/lib/types";
import { CollectionStack } from "@/components/home/collection-stack";
import { EmptyState } from "@/components/home/empty-state";

const DEMO_SIMULATION_DATA: Strain[] = [
  { id: "sim-1", name: "Aurora Ghost Train Haze", brand: "Aurora", slug: "godfather-og", thc_max: 34, type: "sativa", terpenes: ["Terpinolene", "Myrcene", "Limonene"], effects: ["Energy"], image_url: "/strains/godfather-og.jpg", is_medical: true },
  { id: "sim-2", name: "420 Pharma Kush Mint", brand: "420 Pharma", slug: "animal-face", thc_max: 30, type: "hybrid", terpenes: ["Limonene", "Caryophyllene"], effects: ["Relaxation"], image_url: "/strains/animal-face.jpg", is_medical: true },
  { id: "sim-3", name: "Tilray Master Kush", brand: "Tilray", slug: "gmo-cookies", thc_max: 33, type: "indica", terpenes: ["Myrcene", "Limonene"], effects: ["Sleep"], image_url: "/strains/gmo-cookies.jpg", is_medical: true }
];

export default function Home() {
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [strainOfTheDay, setStrainOfTheDay] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    async function fetchUserCollection() {
      if (isDemoMode) {
        setStrains(DEMO_SIMULATION_DATA);
        setStrainOfTheDay(DEMO_SIMULATION_DATA[0]);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Strain of the Day
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
        const { data: allStrains } = await supabase.from('strains').select('*').limit(50);
        if (allStrains && allStrains.length > 0) {
           setStrainOfTheDay(allStrains[dayOfYear % allStrains.length]);
        }

        // 2. Deine Sammlung (user_collection ist die Vault-Quelle)
        const { data: collectionData, error: collError } = await supabase
          .from('user_collection')
          .select(`
            batch_info,
            user_notes,
            user_thc_percent,
            user_cbd_percent,
            user_image_url,
            strain:strains (*)
          `)
          .eq('user_id', user.id);

        if (collError) throw collError;

        if (collectionData && collectionData.length > 0) {
          // Wir holen uns zusätzlich die Ratings für die Sterne-Bewertung
          const { data: ratings } = await supabase
            .from('ratings')
            .select('strain_id, overall_rating, review, consumption_method')
            .eq('user_id', user.id);

          const ratingsMap: Record<string, any> = {};
          ratings?.forEach(r => {
            ratingsMap[r.strain_id] = r;
          });

          const userStrains = collectionData
            .map(item => {
              const s = item.strain as any;
              if (!s) return null;
              const rating = ratingsMap[s.id];
              
              return {
                ...s,
                // Priorität: Persönliches Bild -> Globales Bild
                image_url: item.user_image_url || s.image_url,
                user_review: rating?.review || item.user_notes,
                user_consumption_method: rating?.consumption_method,
                user_overall_rating: rating?.overall_rating,
                avg_thc: item.user_thc_percent || s.avg_thc,
                avg_cbd: item.user_cbd_percent || s.avg_cbd,
                source: item.batch_info || s.source || 'pharmacy'
              };
            })
            .filter(Boolean) as unknown as Strain[];

          setStrains(userStrains);
        } else {
          setStrains([]);
        }
      } catch (err) {
        console.error("Home collection error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) fetchUserCollection();
  }, [user, authLoading, isDemoMode]);

  const nextCard = () => {
    if (strains.length === 0) return;
    setIsFlipped(false);
    setActiveIndex((prev) => (prev + 1) % strains.length);
  };

  const prevCard = () => {
    if (strains.length === 0) return;
    setIsFlipped(false);
    setActiveIndex((prev) => (prev - 1 + strains.length) % strains.length);
  };

  const handleSwipe = (start: number, end: number) => {
    const diff = start - end;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextCard();
      else prevCard();
    }
  };

  return (
    <main className="min-h-screen bg-[#355E3B] text-white pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_50%)]" />
      
      <div className="relative mx-auto max-w-lg px-6 pt-12 flex flex-col gap-10">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <h1 className="text-2xl font-black tracking-widest uppercase italic">CannaLog</h1>
          <div className="w-12 h-8 border border-white/20 rounded flex items-center justify-center text-[8px] text-white/50 uppercase font-bold">
            Logo
          </div>
        </div>

        {strainOfTheDay && (
           <div className="flex flex-col gap-2">
             <h2 className="text-sm font-bold tracking-widest text-[#00F5FF] uppercase">Strain of the Day</h2>
             <div className="w-full bg-[#1e3a24] rounded-[2rem] border border-white/10 p-4 flex items-center gap-4 relative overflow-hidden shadow-2xl">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,245,255,0.1),transparent_70%)]" />
               <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 relative z-10">
                 <img 
                    src={strainOfTheDay.image_url || "/strains/placeholder-1.svg"} 
                    alt={strainOfTheDay.name} 
                    className="w-full h-full object-cover" 
                 />
               </div>
               <div className="flex flex-col justify-center relative z-10 flex-1 min-w-0">
                 <h3 className="text-lg font-black uppercase tracking-tight truncate">{strainOfTheDay.name}</h3>
                 <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2 truncate">{strainOfTheDay.brand || "Original Selection"}</p>
                 <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-black/40 rounded text-[9px] font-bold text-[#00F5FF]">THC: {strainOfTheDay.thc_max || strainOfTheDay.avg_thc || "—"}%</span>
                    <span className="px-2 py-0.5 bg-black/40 rounded text-[9px] font-bold text-white/70 uppercase">{strainOfTheDay.type || "Hybrid"}</span>
                 </div>
               </div>
             </div>
           </div>
        )}

        <div className="flex justify-between items-center">
           <h2 className="text-xl font-bold tracking-tight uppercase">Deine Sammlung</h2>
           {strains.length > 1 && (
             <div className="bg-black/20 rounded-full px-3 py-1 border border-white/10 text-[10px] font-bold">
               {activeIndex + 1} / {strains.length}
             </div>
           )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Synchronisiere Vault...</p>
          </div>
        ) : strains.length > 0 ? (
          <div className="relative group">
            <CollectionStack 
              strains={strains}
              activeIndex={activeIndex}
              isFlipped={isFlipped}
              setIsFlipped={setIsFlipped}
              nextCard={nextCard}
              prevCard={prevCard}
              handleSwipe={handleSwipe}
            />
            
            {strains.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); prevCard(); }}
                  className="absolute -left-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#00F5FF] hover:border-[#00F5FF]/50 transition-all opacity-0 group-hover:opacity-100 hidden md:flex z-20"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextCard(); }}
                  className="absolute -right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#00F5FF] hover:border-[#00F5FF]/50 transition-all opacity-0 group-hover:opacity-100 hidden md:flex z-20"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
      <BottomNav />
    </main>
  );
}
