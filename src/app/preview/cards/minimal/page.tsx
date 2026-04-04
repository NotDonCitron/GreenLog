"use client";

import Image from "next/image";
import { ArrowUpRight, Star } from "lucide-react";

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

export default function MinimalCardPreview() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* Card 1 - Clean Minimal */}
      <div className="group cursor-pointer">
        <div className="relative aspect-[4/5] bg-neutral-100 overflow-hidden mb-4">
          <Image
            src={strain.image}
            alt={strain.name}
            fill
            className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

          {/* Top info */}
          <div className="absolute top-4 left-4 right-4 flex justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/80 bg-black/40 backdrop-blur-sm px-3 py-1.5">
              {strain.farmer}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/80 bg-black/40 backdrop-blur-sm px-3 py-1.5">
              {strain.type}
            </span>
          </div>

          {/* Hover arrow */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <ArrowUpRight size={18} className="text-black" />
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium tracking-tight">{strain.name}</h3>
            <p className="text-sm text-neutral-400 mt-0.5">{strain.thc} THC · {strain.cbd} CBD</p>
          </div>
          <div className="flex items-center gap-1">
            <Star size={12} className="text-black fill-black" />
            <span className="text-sm font-medium">{strain.rating}</span>
          </div>
        </div>
      </div>

      {/* Card 2 - Typography Focus */}
      <div className="group cursor-pointer">
        <div className="bg-neutral-50 border border-neutral-100 p-6 hover:border-neutral-300 transition-colors duration-300">
          <div className="aspect-square bg-neutral-100 mb-6 overflow-hidden">
            <Image
              src={strain.image}
              alt={strain.name}
              width={400}
              height={400}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-xl font-medium tracking-tight">{strain.name}</h3>
            <span className="text-xs text-neutral-400 uppercase tracking-wider">{strain.type}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-neutral-100 mb-4">
            <div>
              <div className="text-2xl font-light">{strain.thc}</div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">THC</div>
            </div>
            <div>
              <div className="text-2xl font-light">{strain.cbd}</div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">CBD</div>
            </div>
            <div>
              <div className="text-2xl font-light">{strain.terpenes.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">Terpene</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {strain.flavors.slice(0, 2).map((f, i) => (
                <span key={i} className="text-xs text-neutral-400">{f}</span>
              ))}
            </div>
            <ArrowUpRight size={16} className="text-neutral-300 group-hover:text-black transition-colors" />
          </div>
        </div>
      </div>

      {/* Card 3 - Editorial */}
      <div className="group cursor-pointer">
        <div className="relative">
          {/* Large number */}
          <div className="text-[120px] font-light text-neutral-100 leading-none absolute -top-6 -left-2 select-none">
            01
          </div>

          <div className="relative pt-12">
            <div className="aspect-[3/4] overflow-hidden mb-6">
              <Image
                src={strain.image}
                alt={strain.name}
                width={400}
                height={500}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-px bg-neutral-300" />
                <span className="text-[10px] uppercase tracking-widest text-neutral-400">{strain.farmer}</span>
              </div>
              <h3 className="text-2xl font-medium tracking-tight">{strain.name}</h3>
              <div className="flex items-center gap-4 text-sm text-neutral-400">
                <span>{strain.thc} THC</span>
                <span className="w-1 h-1 rounded-full bg-neutral-300" />
                <span>{strain.type}</span>
                <span className="w-1 h-1 rounded-full bg-neutral-300" />
                <div className="flex items-center gap-1">
                  <Star size={10} className="fill-neutral-400 text-neutral-400" />
                  {strain.rating}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                {strain.effects.map((e, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-neutral-100 text-neutral-500">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
