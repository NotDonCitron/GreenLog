"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, SlidersHorizontal, Info, RefreshCw, Star, Loader2 } from "lucide-react";

// Demo-Daten als Fallback
const DEMO_STRAINS = [
  {
    id: "demo-1",
    name: "AURORA",
    manufacturer: "MIRA Botanicals",
    thc_max: "22.5",
    type: "indica",
    lineage: "Afghan x Northern Lights",
    terpenes: ["Myrcen", "Limonen"],
    effects: ["Schlaf", "Entspannung"],
    image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "demo-2",
    name: "SUPERNOVA",
    manufacturer: "Galaxy Genetics",
    thc_max: "21.5",
    type: "hybrid",
    lineage: "OG Kush x Cosmic Haze",
    terpenes: ["Pinene", "Linalool"],
    effects: ["Euphorie", "Kreativität"],
    image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "demo-3",
    name: "BLUE DREAM",
    manufacturer: "Pacific Reserve",
    thc_max: "19.0",
    type: "sativa",
    lineage: "Blueberry x Haze",
    terpenes: ["Myrcen", "Pinene"],
    effects: ["Energie", "Glück"],
    image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800",
  }
];

export default function Home() {
  const [strains, setStrains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    async function fetchStrains() {
      try {
        const { data, error } = await supabase
          .from('strains')
          .select('*')
          .limit(10);
        
        if (data && data.length > 0) {
          setStrains(data);
        } else {
          // Fallback auf Demo-Daten
          setStrains(DEMO_STRAINS);
        }
      } catch (e) {
        setStrains(DEMO_STRAINS);
      } finally {
        setLoading(false);
      }
    }
    fetchStrains();
  }, []);

  const nextCard = () => {
    if (strains.length === 0) return;
    setIsFlipped(false);
    setActiveIndex((prev) => (prev + 1) % strains.length);
  };

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      nextCard();
    }
    touchStartX.current = null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0e0e0f] text-white overflow-hidden pb-24">
      <header className="p-6 flex justify-between items-center border-b border-white/10 bg-[#0e0e0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#00F5FF] tracking-[0.3em] font-bold uppercase">Cannalog</span>
          <h1 className="text-xl font-bold tracking-tight uppercase">Meine Collection</h1>
        </div>
        <div className="flex gap-4">
          <button className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <Search size={20} className="text-[#00F5FF]" />
          </button>
          <button className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <SlidersHorizontal size={20} className="text-[#2FF801]" />
          </button>
        </div>
      </header>

      <div 
        className="flex-1 flex flex-col items-center justify-center relative px-6 py-8 select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full max-w-[320px] aspect-[3/4.5] perspective-1000">
          {strains.map((strain, index) => {
            const relativeIndex = (index - activeIndex + strains.length) % strains.length;
            const isTop = relativeIndex === 0;
            
            if (relativeIndex > 2) return null;

            return (
              <div
                key={strain.id}
                className={`absolute inset-0 transition-all duration-700 ease-in-out-expo preserve-3d ${isTop && isFlipped ? 'rotate-y-180' : ''}`}
                style={{
                  transform: isTop && isFlipped 
                    ? `rotateY(180deg)` 
                    : `translateY(${relativeIndex * -12}px) translateX(${relativeIndex * 12}px) scale(${1 - relativeIndex * 0.05}) rotate(${relativeIndex * 2}deg)`,
                  zIndex: strains.length - relativeIndex,
                  opacity: 1,
                }}
                onClick={isTop ? toggleFlip : undefined}
              >
                {/* FRONT OF CARD */}
                <Card className={`absolute inset-0 backface-hidden overflow-hidden border-2 rounded-3xl bg-[#1a191b] shadow-2xl transition-all duration-300 ${isTop ? 'border-[#00F5FF] ring-4 ring-[#00F5FF]/20 shadow-[#00F5FF]/10' : 'border-white/10'}`}>
                  <div className="absolute inset-0 card-holo opacity-40 pointer-events-none" />
                  <div className="h-2/3 relative">
                    <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-[#00F5FF]/30 rounded-full w-12 h-12 flex items-center justify-center text-[10px] font-bold">
                      {strain.thc_max}%
                    </div>
                  </div>
                  <div className="p-5 flex flex-col h-1/3 justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant="outline" className="text-[10px] border-[#2FF801]/30 text-[#2FF801] uppercase">{strain.type}</Badge>
                        <span className="text-[10px] text-white/40 font-mono">#{strain.id.toString().slice(0,4)}</span>
                      </div>
                      <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none mb-1">{strain.name}</h2>
                      <p className="text-xs text-white/50 font-medium uppercase tracking-widest">
                        {strain.id.toString().startsWith('demo') ? 'DEMO CARD' : 'VERIFIED STRAIN'}
                      </p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] font-bold text-[#00F5FF]/80 animate-pulse">
                        TAP TO FLIP →
                      </div>
                    </div>
                  </div>
                </Card>

                {/* BACK OF CARD */}
                <Card className={`absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-3xl bg-[#1a191b] shadow-2xl border-[#2FF801] ring-4 ring-[#2FF801]/20`}>
                  <div className="p-6 h-full flex flex-col justify-between relative">
                    <div>
                      <h3 className="text-[#2FF801] font-bold tracking-widest text-xs uppercase mb-6">Strain Profile</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-white/40 uppercase mb-1">Lineage</p>
                          <p className="text-sm font-medium">{strain.lineage || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase mb-1">Primary Terpenes</p>
                          <div className="flex flex-wrap gap-2">
                            {strain.terpenes?.map((t: string) => (
                              <Badge key={t} variant="secondary" className="bg-[#2FF801]/10 text-[#2FF801] border-none text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase mb-1">Effects</p>
                          <div className="flex flex-wrap gap-2">
                            {strain.effects?.map((e: string) => (
                              <Badge key={e} variant="outline" className="border-white/10 text-white/80 text-[10px]">{e}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[10px] text-[#2FF801] font-bold uppercase">Verified Batch</span>
                      <Info size={16} className="text-white/20" />
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] animate-pulse">Swipe to browse</p>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
