"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, SlidersHorizontal, Info, RefreshCw, Star, Loader2, Plus, FlaskConical } from "lucide-react";
import Link from "next/link";
import { Strain } from "@/lib/types";

const DEMO_SIMULATION_DATA: Strain[] = [
  { id: "sim-1", name: "Godfather OG", slug: "godfather-og", thc_max: 34, type: "indica", terpenes: ["Myrcene", "Limonene"], effects: ["Sleep"], image_url: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?auto=format&fit=crop&q=80&w=800" },
  { id: "sim-2", name: "Animal Face", slug: "animal-face", thc_max: 30, type: "indica", terpenes: ["Caryophyllene"], effects: ["Relaxation"], image_url: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800" },
  { id: "sim-3", name: "GMO Cookies", slug: "gmo-cookies", thc_max: 33, type: "indica", terpenes: ["Myrcene"], effects: ["Euphoria"], image_url: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?auto=format&fit=crop&q=80&w=800" }
];

export default function Home() {
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    async function fetchUserCollection() {
      if (isDemoMode) {
        setStrains(DEMO_SIMULATION_DATA);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('ratings')
        .select(`strain_id, strains (*)`)
        .eq('user_id', user.id);
      
      if (data) {
        const userStrains = data
          .map(item => item.strains)
          .flat()
          .filter(Boolean) as unknown as Strain[];
        setStrains(userStrains);
      }
      setLoading(false);
    }
    if (!authLoading) fetchUserCollection();
  }, [user, authLoading, isDemoMode]);

  const nextCard = () => {
    if (strains.length === 0) return;
    setIsFlipped(false);
    setActiveIndex((prev) => (prev + 1) % strains.length);
  };

  if (loading || authLoading) return <div className="min-h-screen bg-[#0e0e0f] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;

  return (
    <main className="flex min-h-screen flex-col bg-[#0e0e0f] text-white overflow-hidden pb-24">
      <header className="p-6 flex justify-between items-center border-b border-white/10 bg-[#0e0e0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#00F5FF] tracking-[0.3em] font-bold uppercase">Cannalog</span>
          <h1 className="text-xl font-bold tracking-tight uppercase">Meine Collection</h1>
        </div>
        {isDemoMode && <Badge className="bg-[#2FF801] text-black border-none font-bold animate-pulse"><FlaskConical size={12} className="mr-1"/> DEMO</Badge>}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center relative px-6 py-8 select-none" onTouchStart={(e) => touchStartX.current = e.touches[0].clientX} onTouchEnd={(e) => {
        if (!touchStartX.current) return;
        if (Math.abs(touchStartX.current - e.changedTouches[0].clientX) > 50) nextCard();
        touchStartX.current = null;
      }}>
        {strains.length > 0 ? (
          <div className="relative w-full max-w-[320px] aspect-[3/4.5] perspective-1000">
            {strains.map((strain, index) => {
              const relativeIndex = (index - activeIndex + strains.length) % strains.length;
              const isTop = relativeIndex === 0;
              if (relativeIndex > 2) return null;
              return (
                <div key={strain.id} className={`absolute inset-0 transition-all duration-700 ease-in-out-expo preserve-3d ${isTop && isFlipped ? 'rotate-y-180' : ''}`} style={{ transform: isTop && isFlipped ? `rotateY(180deg)` : `translateY(${relativeIndex * -12}px) translateX(${relativeIndex * 12}px) scale(${1 - relativeIndex * 0.05}) rotate(${relativeIndex * 2}deg)`, zIndex: strains.length - relativeIndex }}>
                  <Card onClick={() => isTop && setIsFlipped(!isFlipped)} className={`absolute inset-0 backface-hidden overflow-hidden border-2 rounded-3xl bg-[#1a191b] shadow-2xl transition-all duration-300 ${isTop ? 'border-[#00F5FF] ring-4 ring-[#00F5FF]/20 shadow-[0_0_30px_rgba(0,245,255,0.2)]' : 'border-white/10'}`}>
                    <div className="absolute inset-0 card-holo opacity-40 pointer-events-none" />
                    <div className="h-2/3 relative">
                      <img src={strain.image_url} alt={strain.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-[#00F5FF]/30 rounded-full w-12 h-12 flex items-center justify-center text-[10px] font-bold">{strain.thc_max}%</div>
                    </div>
                    <div className="p-5 flex flex-col h-1/3 justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1"><Badge variant="outline" className="text-[10px] border-[#2FF801]/30 text-[#2FF801] uppercase">{strain.type}</Badge></div>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none mb-1">{strain.name}</h2>
                        <p className="text-xs text-white/50 font-medium uppercase tracking-widest">{isDemoMode ? 'SIMULATED DATA' : 'PERSONAL COLLECTION'}</p>
                      </div>
                      <div className="flex justify-between items-end"><div className="text-[10px] font-bold text-[#00F5FF]/80 animate-pulse">TAP TO FLIP →</div></div>
                    </div>
                  </Card>
                  <Card className={`absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-3xl bg-[#1a191b] shadow-2xl border-[#2FF801] ring-4 ring-[#2FF801]/20`} onClick={() => isTop && setIsFlipped(!isFlipped)}>
                    <div className="p-6 h-full flex flex-col justify-between relative text-left">
                      <div><h3 className="text-[#2FF801] font-bold tracking-widest text-xs uppercase mb-6">Strain Profile</h3><div className="space-y-4"><div><p className="text-[10px] text-white/40 uppercase mb-1">Terpenes</p><div className="flex flex-wrap gap-2">{strain.terpenes?.map((t: string) => (<Badge key={t} variant="secondary" className="bg-[#2FF801]/10 text-[#2FF801] border-none text-[10px]">{t}</Badge>))}</div></div></div></div>
                      <div className="pt-6 border-t border-white/5 flex justify-between items-center"><span className="text-[10px] text-[#2FF801] font-bold uppercase tracking-widest">Demo Member</span><Info size={16} className="text-white/20" /></div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl"><Star className="text-white/20" size={32} /></div>
            <div><h2 className="text-xl font-bold uppercase tracking-tight">Sammlung leer</h2><p className="text-white/40 text-sm mt-2">Gehe zum Katalog oder aktiviere <br /> den Demo-Modus im Profil.</p></div>
            <Link href="/strains"><button className="px-10 py-4 bg-white text-black font-black rounded-2xl uppercase tracking-widest text-sm hover:bg-[#00F5FF] transition-all">Zum Katalog</button></Link>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
