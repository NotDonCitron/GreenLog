"use client";

import { useState, useRef, useEffect, SyntheticEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, SlidersHorizontal, Info, RefreshCw, Star, Loader2, Plus, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Strain } from "@/lib/types";

const DEMO_SIMULATION_DATA: Strain[] = [
  { id: "sim-1", name: "Aurora Ghost Train Haze", brand: "Aurora", slug: "godfather-og", thc_max: 34, type: "sativa", terpenes: ["Terpinolene", "Myrcene", "Limonene"], effects: ["Energy"], image_url: "/strains/godfather-og.jpg", is_medical: true },
  { id: "sim-2", name: "420 Pharma Kush Mint", brand: "420 Pharma", slug: "animal-face", thc_max: 30, type: "hybrid", terpenes: ["Limonene", "Caryophyllene"], effects: ["Relaxation"], image_url: "/strains/animal-face.jpg", is_medical: true },
  { id: "sim-3", name: "Tilray Master Kush", brand: "Tilray", slug: "gmo-cookies", thc_max: 33, type: "indica", terpenes: ["Myrcene", "Limonene"], effects: ["Sleep"], image_url: "/strains/gmo-cookies.jpg", is_medical: true }
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

      // Query ratings table instead of non-existent user_collection
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          review,
          consumption_method,
          overall_rating,
          taste_rating,
          effect_rating,
          look_rating,
          created_at,
          strain:strains (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching collection:", error);
      }

      if (data && data.length > 0) {
        const userStrains = data
          .map(item => {
            const s = item.strain as any;
            if (!s) return null;
            return {
              ...s,
              user_review: item.review,
              user_consumption_method: item.consumption_method,
              user_overall_rating: item.overall_rating,
              user_taste_rating: item.taste_rating,
              user_effect_rating: item.effect_rating,
              user_look_rating: item.look_rating,
              user_rating_date: item.created_at
            };
          })
          .filter(Boolean) as unknown as Strain[];

        // Ensure image URLs are correct in memory
        const correctedStrains = userStrains.map(s => ({
          ...s,
          image_url: s.image_url || `/strains/${s.slug}.jpg`
        }));

        setStrains(correctedStrains);
      } else {
        // No ratings yet - show empty state or prompt to add
        setStrains([]);
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

  const getCannabinoidDisplay = (primary?: number, secondary?: number) => {
    const value = primary ?? secondary;
    return typeof value === "number" ? `${value}%` : "—";
  };

  const getTasteDisplay = (strain: Strain) => {
    if (Array.isArray(strain.terpenes) && strain.terpenes.length > 0) {
      return strain.terpenes
        .map((terpene) => typeof terpene === "string" ? terpene : terpene?.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(" · ");
    }

    return strain.type ? strain.type.toUpperCase() : "—";
  };

  const getEffectDisplay = (strain: Strain) => {
    if (Array.isArray(strain.effects) && strain.effects.length > 0) {
      return strain.effects.slice(0, 2).join(" · ");
    }

    if (Array.isArray(strain.indications) && strain.indications.length > 0) {
      return strain.indications.slice(0, 2).join(" · ");
    }

    return strain.is_medical ? "Medical" : "Balanced";
  };

  const getPrimaryImageUrl = (strain: Strain) => {
    const source = strain.image_url?.trim();

    if (!source) {
      return `/strains/${strain.slug}.jpg`;
    }

    if (source.includes("pollinations.ai") || source.includes("loremflickr.com")) {
      return `/strains/${strain.slug}.jpg`;
    }

    return source;
  };

  const handleCardImageError = (event: SyntheticEvent<HTMLImageElement>, strain: Strain) => {
    const fallbackImage = `/strains/${strain.slug}.jpg`;

    if (event.currentTarget.dataset.fallbackApplied === "true") {
      event.currentTarget.src = "/strains/placeholder-1.svg";
      return;
    }

    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = fallbackImage;
  };

  if (loading || authLoading) return <div className="min-h-screen bg-[#355E3B] flex items-center justify-center"><Loader2 className="animate-spin text-[#00F5FF]" size={40} /></div>;

  return (
    <main className="flex min-h-screen flex-col bg-[#355E3B] text-white overflow-hidden pb-24">
      <header className="p-6 flex justify-between items-end border-b border-white/10 bg-[#355E3B]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#00F5FF] tracking-[0.3em] font-bold uppercase">Cannalog</span>
          <h1 className="text-xl font-bold tracking-tight uppercase">Zuletzt <br/> Hinzugefügt</h1>
        </div>
        <Link href="/collection">
          <button className="text-[9px] text-white/60 hover:text-[#00F5FF] uppercase font-bold tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center transition-colors">
            Alle zeigen <ChevronLeft size={12} className="rotate-180 ml-1" />
          </button>
        </Link>
      </header>

      <div
        className="flex-1 flex flex-col items-center justify-center relative px-6 py-8 select-none"
        onTouchStart={(e) => touchStartX.current = e.touches[0].clientX}
        onTouchEnd={(e) => {
          if (!touchStartX.current) return;
          handleSwipe(touchStartX.current, e.changedTouches[0].clientX);
          touchStartX.current = null;
        }}
        onMouseDown={(e) => touchStartX.current = e.clientX}
        onMouseUp={(e) => {
          if (!touchStartX.current) return;
          handleSwipe(touchStartX.current, e.clientX);
          touchStartX.current = null;
        }}
      >
        {strains.length > 0 ? (
          <div className="relative w-full max-w-[320px] aspect-[3/4.5] perspective-1000">
            {/* Navigation Buttons for PC */}
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 z-[60]">
              <button onClick={(e) => { e.stopPropagation(); prevCard(); }} className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-[#00F5FF]/20 hover:border-[#00F5FF]/40 transition-all">
                <ChevronLeft size={32} className="text-white/40" />
              </button>
            </div>
            <div className="absolute -right-16 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 z-[60]">
              <button onClick={(e) => { e.stopPropagation(); nextCard(); }} className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-[#00F5FF]/20 hover:border-[#00F5FF]/40 transition-all">
                <ChevronLeft size={32} className="text-white/40 rotate-180" />
              </button>
            </div>

            {/* Hint for mobile/mouse */}
            <div className="absolute -bottom-10 left-0 right-0 text-center lg:hidden">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">← Swipe to browse →</p>
            </div>
            {strains.map((strain, index) => {
              const relativeIndex = (index - activeIndex + strains.length) % strains.length;
              const isTop = relativeIndex === 0;
              const thcDisplay = getCannabinoidDisplay(strain.avg_thc, strain.thc_max);
              if (relativeIndex > 2) return null;
              
              const typeStr = (strain.type || '').toLowerCase();
              let themeClass = 'theme-cyan';
              let imageFilter = '';
              let badgeClasses = 'border-[#00FFFF] text-[#00FFFF]';
              let underlineBg = 'bg-[#00FFFF]';
              
              if (typeStr.includes('sativa')) {
                themeClass = 'theme-gold';
                imageFilter = 'saturate-50 contrast-125';
                badgeClasses = 'border-yellow-500 text-yellow-500';
                underlineBg = 'bg-[#fbbf24]';
              } else if (typeStr.includes('indica')) {
                themeClass = 'theme-emerald';
                imageFilter = 'grayscale-[0.2]';
                badgeClasses = 'border-emerald-400 text-emerald-400';
                underlineBg = 'bg-[#10b981]';
              }

              const cbdValue = strain.avg_cbd ?? strain.cbd_max;
              const cbdDisplay = typeof cbdValue === 'number' ? `${cbdValue}%` : '< 1%';
              const effectDisplay = getEffectDisplay(strain);
              const tasteDisplay = getTasteDisplay(strain);

              return (
                <div key={strain.id} className={`absolute inset-0 transition-all duration-700 ease-in-out-expo preserve-3d ${isTop && isFlipped ? 'rotate-y-180' : ''}`} style={{ transform: isTop && isFlipped ? `rotateY(180deg)` : `translateY(${relativeIndex * -12}px) translateX(${relativeIndex * 12}px) scale(${1 - relativeIndex * 0.05}) rotate(${relativeIndex * 2}deg)`, zIndex: strains.length - relativeIndex }}>
                  <Card onClick={() => isTop && setIsFlipped(!isFlipped)} className={`absolute inset-0 backface-hidden overflow-hidden rounded-3xl premium-card ${themeClass} flex flex-col w-full h-full p-0 border-0 ${isTop ? (themeClass === 'theme-cyan' ? 'ring-[3px] ring-[#00FFFF]/60 shadow-[0_0_40px_rgba(0,255,255,0.4)]' : themeClass === 'theme-gold' ? 'ring-[3px] ring-yellow-500/60 shadow-[0_0_40px_rgba(251,191,36,0.4)]' : 'ring-[3px] ring-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.4)]') : ''} transition-opacity duration-300 ${isTop && isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="absolute inset-0 card-holo opacity-40 pointer-events-none z-10" />
                    
                    <div className="p-4 pb-2 z-20 shrink-0">
                      <h2 className="title-font italic text-[22px] text-white font-bold leading-tight uppercase drop-shadow-lg line-clamp-2">
                        {strain.name}
                      </h2>
                      <div className={`w-10 h-0.5 mt-1.5 opacity-70 ${underlineBg}`}></div>
                    </div>

                    <div className="px-4 w-full flex-1 z-20 min-h-0">
                      <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-lg">
                        <img src={getPrimaryImageUrl(strain)} alt={strain.name} className={`absolute inset-0 w-full h-full object-cover ${imageFilter}`} onError={(e) => handleCardImageError(e, strain)} />
                        <div className={`absolute bottom-2 left-2 border bg-black/95 uppercase text-[10px] px-2 py-1 rounded-sm tracking-wider font-bold shadow-md ${badgeClasses}`}>
                          {strain.type || 'HYBRID'}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 mt-3 w-full shrink-0 flex flex-col justify-end pb-4 z-20">
                      <div className="bg-[#1a191b]/95 border border-white/10 rounded-xl p-3 shadow-inner shadow-lg">
                        {/* Row 1: THC & Geschmack */}
                        <div className="grid grid-cols-2 gap-2 border-b border-white/5 pb-2 mb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">THC</span>
                                <span className="accent-text text-[13px] font-bold tracking-wide">{thcDisplay}</span>
                            </div>
                            <div className="flex items-center justify-end border-l border-white/5 pl-2 w-full">
                                <span className="text-gray-100 text-[10px] sm:text-[11px] font-medium tracking-wide leading-tight text-right text-balance">{tasteDisplay}</span>
                            </div>
                        </div>
                        {/* Row 2: CBD & Wirkung */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">CBD</span>
                                <span className="accent-text text-[13px] font-bold tracking-wide">{cbdDisplay}</span>
                            </div>
                            <div className="flex items-center justify-end border-l border-white/5 pl-2 w-full">
                                <span className="text-gray-100 text-[10px] sm:text-[11px] font-medium tracking-wide leading-tight text-right text-balance">{effectDisplay}</span>
                            </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-end mt-3 px-1">
                        <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest animate-pulse">
                          {isTop ? 'TAP TO FLIP →' : 'BROWSE STACK'}
                        </div>
                        <div className="text-[10px] text-white/35 font-mono">
                          {String(activeIndex + 1).padStart(2, '0')}/{String(strains.length).padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card className={`absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-3xl bg-[#1a191b] shadow-2xl border-[#2FF801] ring-4 ring-[#2FF801]/20 transition-opacity duration-300 ${isTop && isFlipped ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none delay-0'}`} onClick={() => isTop && setIsFlipped(!isFlipped)}>
                    <div className="p-6 h-full flex flex-col justify-between relative text-left overflow-y-auto no-scrollbar">
                      <div>
                        <div className="flex justify-between items-center mb-5">
                          <h3 className="text-[#2FF801] font-bold tracking-widest text-xs uppercase">{strain.is_medical ? 'Medical Profile' : 'Strain Profile'}</h3>
                          {(strain.avg_thc || strain.thc_max) && (
                            <Badge variant="outline" className="border-[#2FF801]/30 text-[#2FF801] text-[10px] font-mono">
                              THC: ~{strain.avg_thc || strain.thc_max}%
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-5">
                          {strain.genetics && (
                            <div>
                              <p className="text-[9px] text-white/30 uppercase font-black mb-1">Genetics</p>
                              <p className="text-xs font-bold text-white/90 tracking-tight">{strain.genetics}</p>
                            </div>
                          )}

                          {strain.description && (
                            <div>
                              <p className="text-[9px] text-white/30 uppercase font-black mb-1">Lineage & Effects</p>
                              <p className="text-[11px] font-medium italic text-white/70 leading-relaxed">{strain.description}</p>
                            </div>
                          )}

                          {strain.indications && Array.isArray(strain.indications) && strain.indications.length > 0 && (
                            <div>
                              <p className="text-[9px] text-white/30 uppercase font-black mb-2">Common Indications</p>
                              <div className="flex flex-wrap gap-1.5">
                                {strain.indications.map((ind: string) => (
                                  <Badge key={ind} className="bg-white/5 text-white/60 border-white/10 text-[9px] font-bold">{ind}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <p className="text-[9px] text-white/30 uppercase font-black mb-2">Terpenes</p>
                            <div className="flex flex-wrap gap-1.5">
                              {strain.terpenes && Array.isArray(strain.terpenes) && strain.terpenes.length > 0 ? (
                                strain.terpenes.map((t: any, i: number) => {
                                  const name = typeof t === 'string' ? t : t?.name;
                                  const percent = typeof t === 'object' ? t?.percent : null;
                                  if (!name) return null;
                                  return (
                                    <Badge key={i} variant="secondary" className="bg-[#2FF801]/10 text-[#2FF801] border-none text-[9px] font-bold">
                                      {name}{percent ? ` (${percent}%)` : ''}
                                    </Badge>
                                  );
                                })
                              ) : (
                                <span className="text-[10px] text-white/20 italic">Keine Terpen-Daten verfügbar</span>
                              )}
                            </div>
                          </div>

                          {((strain as any).batch_info || (strain as any).user_notes) && (
                            <div className="pt-4 border-t border-white/10 mt-2 space-y-4">
                              <p className="text-[9px] text-[#00F5FF] uppercase font-black tracking-widest">Mein Journal</p>
                              {(strain as any).batch_info && (
                                <div>
                                  <p className="text-[8px] text-white/30 uppercase font-black mb-1">Batch / Charge</p>
                                  <p className="text-[10px] font-bold text-white/90">{(strain as any).batch_info}</p>
                                </div>
                              )}
                              {(strain as any).user_notes && (
                                <div>
                                  <p className="text-[8px] text-white/30 uppercase font-black mb-1">Persönliche Notizen</p>
                                  <p className="text-[10px] font-medium italic text-white/70 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                                    {(strain as any).user_notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pt-4 mt-4 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[10px] text-[#2FF801] font-bold uppercase tracking-widest">{strain.is_medical ? 'Pharma Certified' : 'Verified Bud'}</span>
                        <Info size={16} className="text-white/20" />
                      </div>
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
