"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, SlidersHorizontal, Info, RefreshCw, Star, Loader2, Plus } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [strains, setStrains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    async function fetchUserCollection() {
      if (!user) {
        setLoading(false);
        return;
      }

      // Strains abrufen, die der User in 'ratings' (Logbuch) hat
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          strain_id,
          strains (*)
        `)
        .eq('user_id', user.id);
      
      if (data) {
        const userStrains = data.map(item => item.strains).filter(Boolean);
        setStrains(userStrains);
      }
      setLoading(false);
    }
    if (!authLoading) fetchUserCollection();
  }, [user, authLoading]);

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

  if (loading || authLoading) {
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
        {!user ? (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
              <Plus className="text-[#00F5FF]" size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Bereit zum Sammeln?</h2>
              <p className="text-white/40 text-sm mt-2">Logge dich ein, um deine erste Karte <br /> in die Collection aufzunehmen.</p>
            </div>
            <Link href="/login">
              <button className="px-10 py-4 bg-[#00F5FF] text-black font-black rounded-2xl uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(0,245,255,0.3)]">
                Einloggen
              </button>
            </Link>
          </div>
        ) : strains.length > 0 ? (
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
                        <p className="text-xs text-white/50 font-medium uppercase tracking-widest">PERSONAL COLLECTION</p>
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
                        <span className="text-[10px] text-[#2FF801] font-bold uppercase tracking-widest">Collection Member</span>
                        <Info size={16} className="text-white/20" />
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
              <Star className="text-white/20" size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Deine Sammlung ist leer</h2>
              <p className="text-white/40 text-sm mt-2">Gehe zum Katalog und füge <br /> deine ersten Strains hinzu.</p>
            </div>
            <Link href="/strains">
              <button className="px-10 py-4 bg-white text-black font-black rounded-2xl uppercase tracking-widest text-sm hover:bg-[#00F5FF] transition-all">
                Zum Katalog
              </button>
            </Link>
          </div>
        )}

        {strains.length > 0 && (
          <div className="mt-12 flex flex-col items-center gap-4">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] animate-pulse">Swipe your collection</p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
