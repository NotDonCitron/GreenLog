"use client";

import { Strain } from "@/lib/types";
import { formatPercent, getEffectDisplay, getStrainTheme, normalizeTerpeneList } from "@/lib/strain-display";
import { resolvePublicMediaUrl } from "@/lib/public-media-url";
import { TerpeneRadarChart } from "@/components/strains/terpene-radar-chart";

interface StrainCompareCardProps {
  strain: Strain;
}

export function StrainCompareCard({ strain }: StrainCompareCardProps) {
  const { color: themeColor } = getStrainTheme(strain.type);
  const thcDisplay = formatPercent(strain.avg_thc ?? strain.thc_max, "—");
  const cbdDisplay = formatPercent(strain.avg_cbd ?? strain.cbd_max, "< 1%");
  const effectDisplay = getEffectDisplay(strain);
  const normalizedTerpenes = normalizeTerpeneList(strain.terpenes);
  const flavors = strain.flavors || [];

  const thcPercent = strain.avg_thc ?? strain.thc_max ?? 0;
  const cbdPercent = strain.avg_cbd ?? strain.cbd_max ?? 0;

  const farmerDisplay = strain.farmer?.trim() || strain.manufacturer?.trim() || strain.brand?.trim() || "Unbekannter Farmer";

  return (
    <div
      className="rounded-2xl bg-[#1a1a1a] border-t-2 overflow-hidden"
      style={{ borderTopColor: themeColor }}
    >
      {/* Header: Image + Name — using img tag to bypass Vercel image optimization limit */}
      <div className="relative aspect-[4/3] bg-[#252525]">
        <img
          src={resolvePublicMediaUrl(strain.image_url) ?? "/strains/placeholder-1.svg"}
          alt={strain.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute bottom-2 left-2">
          <span
            className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider backdrop-blur-md"
            style={{
              backgroundColor: `${themeColor}30`,
              border: `1px solid ${themeColor}80`,
              color: themeColor,
            }}
          >
            {strain.type === "sativa" ? "Sativa" : strain.type === "indica" ? "Indica" : "Hybrid"}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--muted-foreground)] mb-0.5">
            {farmerDisplay}
          </p>
          <h3 className="font-black italic uppercase text-[var(--foreground)] leading-tight">
            {strain.name}
          </h3>
        </div>

        {/* THC */}
        <div>
          <div className="flex justify-between text-[9px] text-[var(--muted-foreground)] mb-1">
            <span className="font-bold uppercase tracking-widest">THC</span>
            <span className="text-[#2FF801] font-bold">{thcDisplay}</span>
          </div>
          <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2FF801] rounded-full transition-all"
              style={{ width: `${Math.min(thcPercent, 30) / 30 * 100}%` }}
            />
          </div>
        </div>

        {/* CBD */}
        <div>
          <div className="flex justify-between text-[9px] text-[var(--muted-foreground)] mb-1">
            <span className="font-bold uppercase tracking-widest">CBD</span>
            <span className="text-[#00F5FF] font-bold">{cbdDisplay}</span>
          </div>
          <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00F5FF] rounded-full transition-all"
              style={{ width: `${Math.min(cbdPercent, 20) / 20 * 100}%` }}
            />
          </div>
        </div>

        {/* Effects */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Wirkung</p>
          <div className="flex flex-wrap gap-1.5">
            {effectDisplay.split(" · ").slice(0, 4).map((effect, i) => (
              <span key={i} className="text-[8px] font-bold px-2 py-1 bg-[#252525] rounded-md text-white/70">
                {effect}
              </span>
            ))}
          </div>
        </div>

        {/* Flavors */}
        {flavors.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Geschmack</p>
            <div className="flex flex-wrap gap-1.5">
              {flavors.slice(0, 4).map((flavor, i) => (
                <span key={i} className="text-[8px] font-bold px-2 py-1 bg-[#252525] rounded-md text-white/70">
                  {flavor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Terpenes */}
        {normalizedTerpenes.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Terpene</p>
            {strain.terpenes && strain.terpenes.length >= 3 ? (
              <TerpeneRadarChart
                terpenes={strain.terpenes}
                themeColor={themeColor}
                size={140}
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {normalizedTerpenes.slice(0, 5).map((t, i) => (
                  <span
                    key={i}
                    className="text-[8px] font-bold px-2 py-1 rounded-md"
                    style={{
                      backgroundColor: `${themeColor}15`,
                      border: `1px solid ${themeColor}40`,
                      color: themeColor,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
