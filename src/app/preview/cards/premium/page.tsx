"use client";

import Image from "next/image";
import { Crown, Star, Gem, ChevronRight } from "lucide-react";

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

export default function PremiumCardPreview() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* Card 1 - Luxury Showcase */}
      <div className="group cursor-pointer">
        <div className="relative p-[1px] rounded-2xl bg-gradient-to-br from-[#c9a84c]/40 via-[#c9a84c]/10 to-transparent group-hover:from-[#c9a84c]/60 group-hover:via-[#c9a84c]/20 transition-all duration-500">
          <div className="rounded-2xl overflow-hidden bg-[#141414]">
            <div className="relative aspect-[4/5]">
              <Image
                src={strain.image}
                alt={strain.name}
                fill
                className="object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/50 to-transparent" />

              {/* Top accent */}
              <div className="absolute top-5 left-5 right-5 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-[#c9a84c]" />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#c9a84c]/70">{strain.farmer}</span>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20">
                  <Star size={10} className="text-[#c9a84c] fill-[#c9a84c]" />
                  <span className="text-xs text-[#c9a84c]">{strain.rating}</span>
                </div>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="w-12 h-px bg-gradient-to-r from-[#c9a84c]/60 to-transparent mb-4" />
                <h3 className="text-2xl font-light tracking-wide text-[#f5f0e8] mb-1" style={{ fontFamily: "Georgia, serif" }}>
                  {strain.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-[#f5f0e8]/40 tracking-wider uppercase">
                  <span>{strain.type}</span>
                  <span className="w-px h-3 bg-[#f5f0e8]/20" />
                  <span>{strain.thc} THC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 - Compact Premium */}
      <div className="group cursor-pointer">
        <div className="rounded-2xl overflow-hidden bg-[#141414] border border-[#c9a84c]/10 hover:border-[#c9a84c]/30 transition-all duration-300">
          <div className="relative aspect-square">
            <Image
              src={strain.image}
              alt={strain.name}
              fill
              className="object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] to-transparent" />
          </div>

          <div className="p-6 -mt-12 relative z-10">
            <div className="rounded-xl bg-[#1a1a1a] border border-[#c9a84c]/10 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#c9a84c]/50 mb-1">{strain.farmer}</p>
                  <h3 className="text-lg font-light tracking-wide text-[#f5f0e8]" style={{ fontFamily: "Georgia, serif" }}>
                    {strain.name}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#c9a84c]/10 flex items-center justify-center shrink-0">
                  <Gem size={18} className="text-[#c9a84c]/60" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#c9a84c]/10">
                <div className="text-center">
                  <div className="text-lg text-[#c9a84c]" style={{ fontFamily: "Georgia, serif" }}>{strain.thc}</div>
                  <div className="text-[9px] tracking-[0.15em] uppercase text-[#f5f0e8]/30">THC</div>
                </div>
                <div className="text-center">
                  <div className="text-lg text-[#c9a84c]" style={{ fontFamily: "Georgia, serif" }}>{strain.cbd}</div>
                  <div className="text-[9px] tracking-[0.15em] uppercase text-[#f5f0e8]/30">CBD</div>
                </div>
                <div className="text-center">
                  <div className="text-lg text-[#c9a84c]" style={{ fontFamily: "Georgia, serif" }}>{strain.terpenes.length}</div>
                  <div className="text-[9px] tracking-[0.15em] uppercase text-[#f5f0e8]/30">Terpene</div>
                </div>
                <div className="text-center">
                  <div className="text-lg text-[#c9a84c]" style={{ fontFamily: "Georgia, serif" }}>{strain.rating}</div>
                  <div className="text-[9px] tracking-[0.15em] uppercase text-[#f5f0e8]/30">Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 - Elegant Vertical */}
      <div className="group cursor-pointer">
        <div className="rounded-2xl overflow-hidden bg-[#141414] border border-[#c9a84c]/10 hover:border-[#c9a84c]/30 transition-all duration-300">
          {/* Image */}
          <div className="relative aspect-[3/4]">
            <Image
              src={strain.image}
              alt={strain.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0c]/60 via-transparent to-[#0c0c0c]" />

            {/* Type badge */}
            <div className="absolute top-5 left-5">
              <div className="px-3 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/30 text-[10px] tracking-[0.15em] uppercase text-[#c9a84c]">
                {strain.type}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 -mt-16 relative z-10">
            <div className="rounded-xl bg-[#1a1a1a]/90 backdrop-blur-sm border border-[#c9a84c]/10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-px bg-[#c9a84c]/40" />
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#c9a84c]/50">{strain.farmer}</span>
              </div>

              <h3 className="text-xl font-light tracking-wide text-[#f5f0e8] mb-3" style={{ fontFamily: "Georgia, serif" }}>
                {strain.name}
              </h3>

              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={i < Math.floor(strain.rating) ? "text-[#c9a84c] fill-[#c9a84c]" : "text-[#f5f0e8]/20"}
                  />
                ))}
                <span className="text-xs text-[#f5f0e8]/40 ml-2">{strain.rating}</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#c9a84c]/10">
                <div>
                  <div className="text-sm text-[#c9a84c]">{strain.thc}</div>
                  <div className="text-[9px] tracking-[0.15em] uppercase text-[#f5f0e8]/30">THC</div>
                </div>
                <div className="w-px h-6 bg-[#c9a84c]/10" />
                <div>
                  <div className="text-sm text-[#c9a84c]">{strain.cbd}</div>
                  <div className="text-[9px] tracking-[0.15em] uppercase text-[#f5f0e8]/30">CBD</div>
                </div>
                <div className="w-px h-6 bg-[#c9a84c]/10" />
                <ChevronRight size={16} className="text-[#c9a84c]/30 group-hover:text-[#c9a84c] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
