"use client";

import { Strain } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface CollectionStackProps {
  strains: (Strain & {
    user_review?: string | null;
    user_overall_rating?: number | null;
    user_consumption_method?: string | null;
    user_rating_date?: string | null;
  })[];
  activeIndex: number;
  isFlipped: boolean;
  setIsFlipped: (flipped: boolean) => void;
  nextCard: () => void;
  prevCard: () => void;
  handleSwipe: (start: number, end: number) => void;
}

export function CollectionStack({
  strains,
  activeIndex,
  isFlipped,
  setIsFlipped,
  handleSwipe,
}: CollectionStackProps) {
  const currentStrain = strains[activeIndex];

  const extractDisplayName = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return null;
    if ('name' in value) return (value as any).name;
    if ('label' in value) return (value as any).label;
    return null;
  };
  
  const getTasteDisplay = (strain: Strain) => {
    if (Array.isArray(strain.flavors) && strain.flavors.length > 0) {
      return strain.flavors.map(f => extractDisplayName(f)).filter(Boolean).slice(0, 2).join(", ");
    }
    return "Zitrus, Erdig";
  };

  const getEffectDisplay = (strain: Strain) => {
    if (Array.isArray(strain.effects) && strain.effects.length > 0) {
      return strain.effects.map(e => extractDisplayName(e)).filter(Boolean).slice(0, 1).join("");
    }
    return strain.is_medical ? "Medical" : "Euphorie";
  };

  const typeDisplay = (extractDisplayName(currentStrain.type) || "Hybrid").toUpperCase();

  // Color Mapping
  const getThemeColor = () => {
    switch(typeDisplay.toLowerCase()) {
      case 'sativa': return '#fbbf24';
      case 'indica': return '#10b981';
      case 'hybrid': return '#00FFFF';
      default: return '#00FFFF';
    }
  };

  const themeColor = getThemeColor();

  return (
    <div className="relative w-full aspect-[3/4.5] perspective-1000 max-w-[340px] mx-auto">
      <div 
        className={`relative w-full h-full transition-all duration-500 preserve-3d cursor-pointer ${isFlipped ? "rotate-y-180" : ""}`}
        onClick={() => setIsFlipped(!isFlipped)}
        onTouchStart={(e) => (window as any).touchStart = e.touches[0].clientX}
        onTouchEnd={(e) => {
          const start = (window as any).touchStart;
          const end = e.changedTouches[0].clientX;
          handleSwipe(start, end);
        }}
        onMouseDown={(e) => (window as any).mouseStart = e.clientX}
        onMouseUp={(e) => {
          const start = (window as any).mouseStart;
          const end = e.clientX;
          if (start && Math.abs(start - end) > 10) handleSwipe(start, end);
        }}
      >
        {/* Front Side */}
        <Card 
          className="absolute inset-0 backface-hidden rounded-[20px] overflow-hidden bg-[#121212] shadow-2xl flex flex-col border-2"
          style={{ borderColor: themeColor, boxShadow: `0 0 15px ${themeColor}4d` }}
        >
          <div className="p-6 pb-4">
            <h2 className="font-serif italic text-2xl text-white font-bold leading-tight uppercase line-clamp-2">{currentStrain.name}</h2>
            <div className="w-12 h-0.5 mt-2 opacity-70" style={{ backgroundColor: themeColor }}></div>
          </div>

          <div className="px-5 w-full">
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <img src={currentStrain.image_url || "/strains/placeholder-1.svg"} alt={currentStrain.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 border bg-black/70 backdrop-blur-md uppercase text-[9px] px-2 py-1 rounded-sm font-bold" style={{ borderColor: themeColor, color: themeColor }}>{typeDisplay}</div>
            </div>
          </div>

          <div className="px-5 mt-5 w-full mb-5">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-inner backdrop-blur-sm shadow-md">
              {/* Row 1: THC & Geschmack */}
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-2 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-[9px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">THC</span>
                  <span className="text-sm font-bold tracking-wide" style={{ color: themeColor }}>{currentStrain.avg_thc || currentStrain.thc_max || "—"}%</span>
                </div>
                <div className="flex items-center justify-end border-l border-white/5 pl-4 w-full">
                  <span className="text-gray-100 text-[10px] font-medium tracking-wide truncate">{getTasteDisplay(currentStrain)}</span>
                </div>
              </div>
              {/* Row 2: CBD & Wirkung */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-[9px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">CBD</span>
                  <span className="text-sm font-bold tracking-wide" style={{ color: themeColor }}>{currentStrain.avg_cbd || currentStrain.cbd_max || "—"}%</span>
                </div>
                <div className="flex items-center justify-end border-l border-white/5 pl-4 w-full">
                  <span className="text-gray-100 text-[10px] font-medium tracking-wide truncate">{getEffectDisplay(currentStrain)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Back Side */}
        <Card 
          className="absolute inset-0 rotate-y-180 backface-hidden rounded-[20px] overflow-hidden bg-[#121212] shadow-2xl p-8 flex flex-col border-2"
          style={{ borderColor: themeColor }}
        >
          <div className="flex-1 space-y-6">
            <h3 className="font-serif italic text-xl font-bold uppercase text-white">Journal Notes</h3>
            <p className="text-sm text-white/70 italic leading-relaxed line-clamp-6">{currentStrain.user_review || "Noch keine Notizen hinterlegt."}</p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div>
                <p className="text-[9px] font-black uppercase text-white/30">Method</p>
                <p className="text-xs font-bold text-white/80">{currentStrain.user_consumption_method || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-white/30">Source</p>
                <p className="text-xs font-bold uppercase" style={{ color: themeColor }}>{currentStrain.source || "Unknown"}</p>
              </div>
            </div>
          </div>
          <div className="mt-auto flex justify-center items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
            <RefreshCw size={12} className="animate-spin-slow" /> Tap to Flip
          </div>
        </Card>
      </div>
    </div>
  );
}
