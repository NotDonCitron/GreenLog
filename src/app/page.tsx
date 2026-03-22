"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, SlidersHorizontal } from "lucide-react";

// Mock-Daten für die Strains
const MOCK_STRAINS = [
  {
    id: "1",
    name: "AURORA",
    manufacturer: "MIRA Botanicals",
    thc: "22.5%",
    type: "Indica",
    color: "from-cyan-500 to-blue-600",
    image: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "2",
    name: "SUPERNOVA",
    manufacturer: "Galaxy Genetics",
    thc: "21.5%",
    type: "Hybrid",
    color: "from-purple-500 to-pink-600",
    image: "https://images.unsplash.com/photo-1536859355448-76f926813d1d?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "3",
    name: "BLUE DREAM",
    manufacturer: "Pacific Reserve",
    thc: "19.0%",
    type: "Sativa",
    color: "from-blue-400 to-indigo-500",
    image: "https://images.unsplash.com/photo-1599733589046-10c005739ef0?q=80&w=1000&auto=format&fit=crop",
  }
];

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextCard = () => {
    setActiveIndex((prev) => (prev + 1) % MOCK_STRAINS.length);
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#0e0e0f] text-white overflow-hidden pb-24">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-white/10 bg-[#0e0e0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#00F5FF] tracking-[0.3em] font-bold uppercase">Cannalog</span>
          <h1 className="text-xl font-bold tracking-tight">MEINE COLLECTION</h1>
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
      <div className="flex-1 flex flex-col items-center justify-center relative px-6 py-12 group cursor-pointer" onClick={nextCard}>
        <div className="relative w-full max-w-[320px] aspect-[3/4.5] perspective-1000">
          {MOCK_STRAINS.map((strain, index) => {
            // Berechnung der Position im Stapel
            const relativeIndex = (index - activeIndex + MOCK_STRAINS.length) % MOCK_STRAINS.length;
            const isTop = relativeIndex === 0;
            
            return (
              <div
                key={strain.id}
                className="absolute inset-0 transition-all duration-500 ease-out-expo"
                style={{
                  transform: `
                    translateY(${relativeIndex * -12}px) 
                    translateX(${relativeIndex * 12}px) 
                    scale(${1 - relativeIndex * 0.05})
                    rotate(${relativeIndex * 2}deg)
                  `,
                  zIndex: MOCK_STRAINS.length - relativeIndex,
                  opacity: relativeIndex > 2 ? 0 : 1,
                  pointerEvents: isTop ? "auto" : "none",
                }}
              >
                <Card className={`w-full h-full overflow-hidden border-2 rounded-3xl bg-[#1a191b] shadow-2xl transition-all duration-300 ${isTop ? 'border-[#00F5FF] ring-4 ring-[#00F5FF]/20 shadow-[#00F5FF]/10' : 'border-white/10'}`}>
                  {/* Holographic Frame Effect */}
                  <div className="absolute inset-0 card-holo opacity-40 pointer-events-none" />
                  
                  {/* Strain Image */}
                  <div className="h-2/3 relative">
                    <img 
                      src={strain.image} 
                      alt={strain.name}
                      className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a191b] via-transparent to-transparent" />
                    
                    {/* THC Gauge Placeholder */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-[#00F5FF]/30 rounded-full w-12 h-12 flex items-center justify-center text-[10px] font-bold">
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/10" />
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" fill="transparent" strokeDasharray="125.6" strokeDashoffset="30" className="text-[#00F5FF]" />
                      </svg>
                      {strain.thc}
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-5 flex flex-col h-1/3 justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant="outline" className="text-[10px] border-[#2FF801]/30 text-[#2FF801] uppercase tracking-tighter">
                          {strain.type}
                        </Badge>
                        <span className="text-[10px] text-white/40 font-mono">#00{strain.id}</span>
                      </div>
                      <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none mb-1">
                        {strain.name}
                      </h2>
                      <p className="text-xs text-white/50 font-medium uppercase tracking-widest">{strain.manufacturer}</p>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#00F5FF]/50" />
                        ))}
                      </div>
                      <div className="text-[10px] font-bold text-[#00F5FF]/80 animate-pulse">
                        TAP TO FLIP →
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
        
        {/* Interaction Indicator */}
        <div className="mt-12 flex flex-col items-center gap-4 animate-bounce">
          <div className="flex gap-2">
            {MOCK_STRAINS.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === i ? 'w-8 bg-[#00F5FF]' : 'w-1.5 bg-white/20'}`} 
              />
            ))}
          </div>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.4em]">Swipe Stack</p>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
