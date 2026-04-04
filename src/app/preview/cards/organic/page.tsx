"use client";

import Image from "next/image";
import { Leaf, Droplets, Star, MapPin } from "lucide-react";

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

const typeColors = {
  sativa: { bg: "#8faa5c", text: "#6b8f3c", light: "#e8f0d8" },
  indica: { bg: "#9b6bb0", text: "#7a4d94", light: "#f0e0f5" },
  hybrid: { bg: "#6b9db0", text: "#4d7a8a", light: "#e0f0f5" },
};

export default function OrganicCardPreview() {
  const colors = typeColors[strain.type];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* Card 1 - Classic Organic */}
      <div className="group rounded-3xl overflow-hidden bg-white border border-[#c4a87c]/20 shadow-sm hover:shadow-xl hover:shadow-[#6b8f3c]/10 transition-all duration-300">
        <div className="relative aspect-[4/3]">
          <Image
            src={strain.image}
            alt={strain.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#f5f0e8] via-transparent to-transparent" />

          {/* Type badge */}
          <div
            className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-white text-xs font-medium flex items-center gap-1.5"
            style={{ backgroundColor: colors.bg }}
          >
            <Leaf size={12} />
            {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
          </div>

          {/* Rating */}
          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm flex items-center gap-1">
            <Star size={12} className="text-amber-500 fill-amber-500" />
            <span className="text-xs font-medium text-[#2c2416]">{strain.rating}</span>
          </div>

          {/* Name overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-[10px] uppercase tracking-wider text-[#6b5d4f]/70 mb-1">{strain.farmer}</p>
            <h3 className="text-xl font-bold text-[#2c2416]" style={{ fontFamily: "Georgia, serif" }}>
              {strain.name}
            </h3>
          </div>
        </div>

        <div className="p-5">
          {/* Stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{strain.thc}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#6b5d4f]">THC</div>
            </div>
            <div className="w-px h-8 bg-[#c4a87c]/20" />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{strain.cbd}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#6b5d4f]">CBD</div>
            </div>
            <div className="w-px h-8 bg-[#c4a87c]/20" />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{strain.terpenes.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#6b5d4f]">Terpene</div>
            </div>
          </div>

          {/* Effects */}
          <div className="flex flex-wrap gap-2 mb-3">
            {strain.effects.map((effect, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: colors.light, color: colors.text }}
              >
                {effect}
              </span>
            ))}
          </div>

          {/* Flavors */}
          <div className="flex items-center gap-2 text-xs text-[#6b5d4f]">
            <Droplets size={12} />
            <span>{strain.flavors.join(" · ")}</span>
          </div>
        </div>
      </div>

      {/* Card 2 - Compact Organic */}
      <div className="group rounded-3xl overflow-hidden bg-white border border-[#c4a87c]/20 shadow-sm hover:shadow-xl hover:shadow-[#6b8f3c]/10 transition-all duration-300">
        <div className="relative aspect-square">
          <Image
            src={strain.image}
            alt={strain.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          <div className="absolute top-4 left-4">
            <div
              className="px-3 py-1.5 rounded-full text-white text-xs font-medium"
              style={{ backgroundColor: colors.bg }}
            >
              {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-[10px] uppercase tracking-wider text-white/60 mb-1">{strain.farmer}</p>
            <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "Georgia, serif" }}>
              {strain.name}
            </h3>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <span className="text-lg font-bold text-white">{strain.thc}</span>
                <span className="text-[10px] text-white/70 uppercase">THC</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <span className="text-lg font-bold text-white">{strain.cbd}</span>
                <span className="text-[10px] text-white/70 uppercase">CBD</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 - Vertical Organic */}
      <div className="group rounded-3xl overflow-hidden bg-[#f5f0e8] border border-[#c4a87c]/30 hover:shadow-xl hover:shadow-[#6b8f3c]/10 transition-all duration-300">
        <div className="relative aspect-[3/4]">
          <Image
            src={strain.image}
            alt={strain.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        <div className="p-5 -mt-8 relative z-10">
          <div className="bg-white rounded-2xl p-5 border border-[#c4a87c]/20 shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#6b5d4f]/60 mb-0.5">{strain.farmer}</p>
                <h3 className="text-lg font-bold text-[#2c2416]" style={{ fontFamily: "Georgia, serif" }}>
                  {strain.name}
                </h3>
              </div>
              <div
                className="px-2.5 py-1 rounded-full text-white text-[10px] font-medium"
                style={{ backgroundColor: colors.bg }}
              >
                {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-[#2c2416]">{strain.rating}</span>
              </div>
              <span className="text-[#6b5d4f]/30">·</span>
              <div className="flex items-center gap-1 text-[#6b5d4f]">
                <MapPin size={12} />
                <span className="text-xs">{strain.flavors[0]}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#c4a87c]/20">
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: colors.text }}>{strain.thc}</div>
                <div className="text-[9px] uppercase tracking-wider text-[#6b5d4f]/60">THC</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: colors.text }}>{strain.cbd}</div>
                <div className="text-[9px] uppercase tracking-wider text-[#6b5d4f]/60">CBD</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: colors.text }}>{strain.terpenes.length}</div>
                <div className="text-[9px] uppercase tracking-wider text-[#6b5d4f]/60">Terpene</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
