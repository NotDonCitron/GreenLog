"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, SlidersHorizontal, Info, RefreshCw, Star } from "lucide-react";

// Mock-Daten für die Strains mit Rückseiten-Infos
const MOCK_STRAINS = [
  {
    id: "1",
    name: "AURORA",
    manufacturer: "MIRA Botanicals",
    thc: "22.5%",
    type: "Indica",
    lineage: "Afghan x Northern Lights",
    terpenes: ["Myrcen", "Limonen", "Caryophyllen"],
    effects: ["Schlaf", "Entspannung", "Appetit"],
    image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "2",
    name: "SUPERNOVA",
    manufacturer: "Galaxy Genetics",
    thc: "21.5%",
    type: "Hybrid",
    lineage: "OG Kush x Cosmic Haze",
    terpenes: ["Pinene", "Linalool", "Myrcen"],
    effects: ["Euphorie", "Kreativität", "Fokus"],
    image: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "3",
    name: "BLUE DREAM",
    manufacturer: "Pacific Reserve",
    thc: "19.0%",
    type: "Sativa",
    lineage: "Blueberry x Haze",
    terpenes: ["Myrcen", "Pinene", "Limonen"],
    effects: ["Energie", "Glück", "Motivation"],
    image: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?q=80&w=1000&auto=format&fit=crop",
  }
];

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const nextCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setActiveIndex((prev) => (prev + 1) % MOCK_STRAINS.length);
  };

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#0e0e0f] text-white overflow-hidden pb-24">
      {/* Header */}
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

      {/* Card Stack Container */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-6 py-8">
        <div className="relative w-full max-w-[320px] aspect-[3/4.5] perspective-1000">
          {MOCK_STRAINS.map((strain, index) => {
            const relativeIndex = (index - activeIndex + MOCK_STRAINS.length) % MOCK_STRAINS.length;
            const isTop = relativeIndex === 0;
            
            if (relativeIndex > 2) return null; // Nur die obersten 3 Karten rendern

            return (
              <div
                key={strain.id}
                className={`absolute inset-0 transition-all duration-700 ease-in-out-expo preserve-3d ${isTop && isFlipped ? 'rotate-y-180' : ''}`}
                style={{
                  transform: isTop && isFlipped 
                    ? `rotateY(180deg)` 
                    : `translateY(${relativeIndex * -12}px) translateX(${relativeIndex * 12}px) scale(${1 - relativeIndex * 0.05}) rotate(${relativeIndex * 2}deg)`,
                  zIndex: MOCK_STRAINS.length - relativeIndex,
                  opacity: 1,
                }}
                onClick={isTop ? toggleFlip : undefined}
              >
                {/* FRONT OF CARD */}
                <Card className={`absolute inset-0 backface-hidden overflow-hidden border-2 rounded-3xl bg-[#1a191b] shadow-2xl transition-all duration-300 ${isTop ? 'border-[#00F5FF] ring-4 ring-[#00F5FF]/20 shadow-[#00F5FF]/10' : 'border-white/10'}`}>
                  <div className="absolute inset-0 card-holo opacity-40 pointer-events-none" />
                  <div className="h-2/3 relative">
                    <img src={strain.image} alt={strain.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-[#00F5FF]/30 rounded-full w-12 h-12 flex items-center justify-center text-[10px] font-bold">
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/10" />
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="transparent" strokeDasharray="125.6" strokeDashoffset="30" className="text-[#00F5FF]" />
                      </svg>
                      {strain.thc}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col h-1/3 justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant="outline" className="text-[10px] border-[#2FF801]/30 text-[#2FF801] uppercase">{strain.type}</Badge>
                        <span className="text-[10px] text-white/40 font-mono">#00{strain.id}</span>
                      </div>
                      <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none mb-1">{strain.name}</h2>
                      <p className="text-xs text-white/50 font-medium uppercase tracking-widest">{strain.manufacturer}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00F5FF]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#00F5FF]/80 animate-pulse">
                        <RefreshCw size={10} /> FLIP CARD
                      </div>
                    </div>
                  </div>
                </Card>

                {/* BACK OF CARD */}
                <Card className={`absolute inset-0 rotate-y-180 backface-hidden overflow-hidden border-2 rounded-3xl bg-[#1a191b] shadow-2xl border-[#2FF801] ring-4 ring-[#2FF801]/20`}>
                  <div className="p-6 h-full flex flex-col justify-between relative">
                    <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[#2FF801] font-bold tracking-widest text-xs uppercase">Strain Profile</h3>
                        <Star size={16} className="text-[#2FF801]" fill="#2FF801" />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-white/40 uppercase mb-1">Lineage</p>
                          <p className="text-sm font-medium">{strain.lineage}</p>
                        </div>

                        <div>
                          <p className="text-[10px] text-white/40 uppercase mb-1">Primary Terpenes</p>
                          <div className="flex flex-wrap gap-2">
                            {strain.terpenes.map(t => (
                              <Badge key={t} variant="secondary" className="bg-[#2FF801]/10 text-[#2FF801] border-none text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] text-white/40 uppercase mb-1">Reported Effects</p>
                          <div className="flex flex-wrap gap-2">
                            {strain.effects.map(e => (
                              <Badge key={e} variant="outline" className="border-white/10 text-white/80 text-[10px]">{e}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40 uppercase">Authenticity</span>
                          <span className="text-[10px] text-[#2FF801] font-bold">VERIFIED BATCH</span>
                        </div>
                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                          <Info size={20} className="text-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 z-10">
          <button 
            onClick={nextCard}
            className="px-8 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 group"
          >
            <span className="text-xs font-bold tracking-widest uppercase text-white/60 group-hover:text-white">Next Strain</span>
            <RefreshCw size={14} className="text-[#00F5FF]" />
          </button>
        </div>
        
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {MOCK_STRAINS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${activeIndex === i ? 'w-6 bg-[#00F5FF]' : 'w-1 bg-white/20'}`} />
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
