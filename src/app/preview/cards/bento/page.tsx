"use client";

import Image from "next/image";
import { Leaf, Star, Droplets, ArrowUpRight } from "lucide-react";

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

const typeGradients = {
  sativa: "from-green-400 to-emerald-500",
  indica: "from-purple-400 to-indigo-500",
  hybrid: "from-blue-400 to-cyan-500",
};

const typeBgColors = {
  sativa: "bg-green-500",
  indica: "bg-purple-500",
  hybrid: "bg-blue-500",
};

export default function BentoCardPreview() {
  return (
    <div className="space-y-8">
      {/* Card 1 - Modern Card */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="group rounded-3xl overflow-hidden bg-white border border-neutral-200 hover:shadow-xl hover:shadow-neutral-100 transition-all duration-300 cursor-pointer">
          <div className="relative aspect-[4/3]">
            <Image
              src={strain.image}
              alt={strain.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-4 left-4">
              <span className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${typeGradients[strain.type]} text-white text-xs font-medium flex items-center gap-1.5`}>
                <Leaf size={12} />
                {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
              </span>
            </div>
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-sm text-xs font-medium flex items-center gap-1">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                {strain.rating}
              </span>
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs text-neutral-400 mb-1">{strain.farmer}</p>
            <h3 className="text-lg font-semibold mb-4">{strain.name}</h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-neutral-50 text-center">
                <div className="text-lg font-bold">{strain.thc}</div>
                <div className="text-[10px] text-neutral-400 uppercase">THC</div>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 text-center">
                <div className="text-lg font-bold">{strain.cbd}</div>
                <div className="text-[10px] text-neutral-400 uppercase">CBD</div>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 text-center">
                <div className="text-lg font-bold">{strain.terpenes.length}</div>
                <div className="text-[10px] text-neutral-400 uppercase">Terpene</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {strain.effects.map((e, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-neutral-100 text-xs text-neutral-600">
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2 - Compact Square */}
        <div className="group rounded-3xl overflow-hidden bg-white border border-neutral-200 hover:shadow-xl hover:shadow-neutral-100 transition-all duration-300 cursor-pointer">
          <div className="relative aspect-square">
            <Image
              src={strain.image}
              alt={strain.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2.5 py-1 rounded-lg bg-gradient-to-r ${typeGradients[strain.type]} text-white text-[10px] font-medium`}>
                  {strain.type.toUpperCase()}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-white text-[10px]">
                  {strain.thc} THC
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-1">{strain.name}</h3>
              <p className="text-sm text-white/60">{strain.farmer}</p>
            </div>
          </div>
        </div>

        {/* Card 3 - Stats Focus */}
        <div className="group rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-800 text-white hover:shadow-xl hover:shadow-neutral-300 transition-all duration-300 cursor-pointer">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <span className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${typeGradients[strain.type]} text-white text-xs font-medium`}>
                {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
              </span>
              <ArrowUpRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <h3 className="text-2xl font-semibold mb-1">{strain.name}</h3>
            <p className="text-sm text-neutral-400 mb-6">{strain.farmer}</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-3xl font-bold mb-1">{strain.thc}</div>
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider">THC</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-3xl font-bold mb-1">{strain.cbd}</div>
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider">CBD</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Wirkung</div>
                <div className="flex flex-wrap gap-2">
                  {strain.effects.map((e, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Geschmack</div>
                <div className="flex flex-wrap gap-2">
                  {strain.flavors.map((f, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 4 - Horizontal Card */}
      <div className="group rounded-3xl overflow-hidden bg-white border border-neutral-200 hover:shadow-xl hover:shadow-neutral-100 transition-all duration-300 cursor-pointer">
        <div className="flex flex-col md:flex-row">
          <div className="relative md:w-64 aspect-square md:aspect-auto">
            <Image
              src={strain.image}
              alt={strain.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-neutral-400 mb-1">{strain.farmer}</p>
                <h3 className="text-2xl font-semibold">{strain.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${typeGradients[strain.type]} text-white text-xs font-medium`}>
                  {strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-500 fill-amber-500" />
                <span className="font-medium">{strain.rating}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <Droplets size={14} />
                <span className="text-sm">{strain.flavors.join(", ")}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 p-4 rounded-2xl bg-neutral-50 text-center">
                <div className="text-xl font-bold">{strain.thc}</div>
                <div className="text-[10px] text-neutral-400 uppercase">THC</div>
              </div>
              <div className="flex-1 p-4 rounded-2xl bg-neutral-50 text-center">
                <div className="text-xl font-bold">{strain.cbd}</div>
                <div className="text-[10px] text-neutral-400 uppercase">CBD</div>
              </div>
              <div className="flex-1 p-4 rounded-2xl bg-neutral-50 text-center">
                <div className="text-xl font-bold">{strain.terpenes.length}</div>
                <div className="text-[10px] text-neutral-400 uppercase">Terpene</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
