"use client";

import Image from "next/image";
import { Terminal, Database, Activity, Cpu, Zap, Shield } from "lucide-react";

const strain = {
  name: "Ghost Train Haze",
  farmer: "Aurora",
  type: "sativa" as const,
  thc: "34%",
  cbd: "< 1%",
  effects: ["Energy", "Fokus", "Kreativität"],
  flavors: ["Zitrus", "Erdig", "Süß"],
  terpenes: ["Terpinolene", "Myrcene", "Limonene"],
  rating: 4.8,
  image: "/strains/placeholder-1.svg",
};

export default function CyberCardPreview() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Card 1 - Terminal Style */}
      <div className="group border border-[#00ff41]/20 rounded-lg overflow-hidden bg-[#0a0a0a] hover:border-[#00ff41]/40 transition-all duration-300 cursor-pointer">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#00ff41]/20 bg-[#00ff41]/5">
          <div className="w-2 h-2 rounded-full bg-[#00ff41]/40" />
          <div className="w-2 h-2 rounded-full bg-[#00ff41]/30" />
          <div className="w-2 h-2 rounded-full bg-[#00ff41]/20" />
          <span className="font-mono text-[10px] text-[#00ff41]/40 ml-2">strain_view.exe</span>
        </div>

        <div className="relative aspect-[4/3]">
          <Image
            src={strain.image}
            alt={strain.name}
            fill
            className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.1) 2px, rgba(0,255,65,0.1) 4px)",
            }}
          />
        </div>

        <div className="p-4 font-mono text-xs">
          <div className="text-[#00ff41]/60 mb-2">
            <span className="text-[#00ff41]/30">ID:</span> {strain.name.toUpperCase().replace(/ /g, "_")}
          </div>
          <div className="text-[#00ff41]/40 mb-3 text-[10px]">
            <span className="text-[#00ff41]/30">SRC:</span> {strain.farmer} | <span className="text-[#00ff41]/30">TYPE:</span> {strain.type.toUpperCase()}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2 border border-[#00ff41]/10 text-center">
              <div className="text-[#00ff41] font-bold">{strain.thc}</div>
              <div className="text-[#00ff41]/30 text-[9px]">THC</div>
            </div>
            <div className="p-2 border border-[#00ff41]/10 text-center">
              <div className="text-[#00ff41] font-bold">{strain.cbd}</div>
              <div className="text-[#00ff41]/30 text-[9px]">CBD</div>
            </div>
            <div className="p-2 border border-[#00ff41]/10 text-center">
              <div className="text-[#00ff41] font-bold">{strain.terpenes.length}</div>
              <div className="text-[#00ff41]/30 text-[9px]">TRP</div>
            </div>
          </div>

          <div className="text-[#00ff41]/30 text-[10px]">
            <span className="text-[#00ff41]/30">EFFECTS:</span> {strain.effects.join(", ")}
          </div>
        </div>
      </div>

      {/* Card 2 - Data Panel */}
      <div className="group border border-[#00ff41]/20 rounded-lg overflow-hidden bg-[#0a0a0a] hover:border-[#00ff41]/40 transition-all duration-300 cursor-pointer">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-[#00ff41]/60" />
              <span className="font-mono text-xs text-[#00ff41]/60">STRAIN_DB</span>
            </div>
            <span className="font-mono text-[10px] text-[#00ff41]/30">[ACTIVE]</span>
          </div>

          {/* Image */}
          <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-[#00ff41]/10 mb-4">
            <Image
              src={strain.image}
              alt={strain.name}
              fill
              className="object-cover opacity-50 group-hover:opacity-70 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-[#00ff41]/80">{strain.name}</div>
                <div className="font-mono text-[10px] text-[#00ff41]/40">{strain.farmer}</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-[#00ff41]/10">
              <span className="text-[#00ff41]/40">TYPE</span>
              <span className="text-[#00ff41]">{strain.type.toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#00ff41]/10">
              <span className="text-[#00ff41]/40">THC</span>
              <span className="text-[#00ff41]">{strain.thc}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#00ff41]/10">
              <span className="text-[#00ff41]/40">CBD</span>
              <span className="text-[#00ff41]">{strain.cbd}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#00ff41]/10">
              <span className="text-[#00ff41]/40">RATING</span>
              <span className="text-[#00ff41]">{strain.rating}/5.0</span>
            </div>
          </div>

          {/* Effects */}
          <div className="mt-4 font-mono text-[10px] text-[#00ff41]/30">
            <span className="text-[#00ff41]/30">EFFECTS:</span> [{strain.effects.join(", ")}]
          </div>
        </div>
      </div>

      {/* Card 3 - HUD Style */}
      <div className="group relative border border-[#00ff41]/20 rounded-lg overflow-hidden bg-[#0a0a0a] hover:border-[#00ff41]/40 transition-all duration-300 cursor-pointer">
        <div className="relative aspect-[4/5]">
          <Image
            src={strain.image}
            alt={strain.name}
            fill
            className="object-cover opacity-40 group-hover:opacity-60 transition-opacity"
          />

          {/* HUD overlay */}
          <div className="absolute inset-0 p-4">
            {/* Corner brackets */}
            <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-[#00ff41]/40" />
            <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-[#00ff41]/40" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-[#00ff41]/40" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-[#00ff41]/40" />

            {/* Top info */}
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              <span className="font-mono text-[10px] text-[#00ff41]/60">{strain.farmer}</span>
              <span className="font-mono text-[10px] text-[#00ff41]/40">v2.0</span>
            </div>

            {/* Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="font-mono text-xl font-bold text-[#00ff41] mb-1">{strain.name}</div>
                <div className="font-mono text-xs text-[#00ff41]/50">{strain.type.toUpperCase()}</div>
              </div>
            </div>

            {/* Bottom stats */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 border border-[#00ff41]/20 bg-[#0a0a0a]/80 backdrop-blur-sm text-center">
                  <div className="font-mono text-sm font-bold text-[#00ff41]">{strain.thc}</div>
                  <div className="font-mono text-[8px] text-[#00ff41]/30">THC</div>
                </div>
                <div className="p-2 border border-[#00ff41]/20 bg-[#0a0a0a]/80 backdrop-blur-sm text-center">
                  <div className="font-mono text-sm font-bold text-[#00ff41]">{strain.cbd}</div>
                  <div className="font-mono text-[8px] text-[#00ff41]/30">CBD</div>
                </div>
                <div className="p-2 border border-[#00ff41]/20 bg-[#0a0a0a]/80 backdrop-blur-sm text-center">
                  <div className="font-mono text-sm font-bold text-[#00ff41]">{strain.rating}</div>
                  <div className="font-mono text-[8px] text-[#00ff41]/30">RTG</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
