import { memo } from 'react';
import Link from 'next/link';
import { Strain } from '@/lib/types';
import { formatPercent, getEffectDisplay, getStrainTheme, getTasteDisplay } from '@/lib/strain-display';
import { escapeRegExp } from '@/lib/string-utils';
interface StrainCardProps {
  strain: Strain;
  index?: number;
  isCollected?: boolean;
}

export const StrainCard = memo(function StrainCard({ strain, index = 0, isCollected = true }: StrainCardProps) {
  const { color: themeColor, className: themeClass } = getStrainTheme(strain.type);
  const privateNote = "user_notes" in strain && typeof strain.user_notes === "string" ? strain.user_notes.trim() : "";
  const hasPrivateNote = privateNote.length > 0;

  const farmerDisplay = strain.farmer?.trim() || strain.manufacturer?.trim() || strain.brand?.trim() || 'Unbekannter Farmer';
  const thcDisplay = formatPercent(strain.avg_thc ?? strain.thc_max, '—');
  const cbdDisplay = formatPercent(strain.avg_cbd ?? strain.cbd_max, '< 1%');
  const effectDisplay = getEffectDisplay(strain);
  const tasteDisplay = getTasteDisplay(strain);

  // Strip farmer prefix from strain name — handles "420 Pharma: Natural Gorilla Glue" -> "Natural Gorilla Glue"
  // and "420 Natural Gorilla Glue" (farmer="420 Pharma") -> "420 Natural Gorilla Glue" (keep embedded farmer name)
  // and "420 Pharma: 420 Natural Gorilla Glue" (farmer="420 Pharma") -> "420 Natural Gorilla Glue" (strip only first occurrence)
  const normalizedStrainName = (() => {
    const rawName = strain.name?.trim() || '';

    if (!rawName || farmerDisplay === 'Unbekannter Farmer') {
      return rawName;
    }

    const farmerLower = farmerDisplay.toLowerCase();

    // Try stripping the full farmer name (e.g., "420 Pharma: " from "420 Pharma: Natural Gorilla Glue")
    const withoutFarmerPrefix = rawName.replace(
      new RegExp(`^${escapeRegExp(farmerDisplay)}[\s:/-]*`, 'i'),
      ''
    ).trim();

    // Check if remaining text STILL starts with the farmer name (or its first word)
    // This means the farmer name was BOTH at the start of the strain name AND embedded in it
    // e.g., farmer="420 Pharma", name="420 Pharma: 420 Natural Gorilla Glue" -> keep "420 Natural Gorilla Glue"
    const firstWord = farmerDisplay.split(/\s+/)[0].toLowerCase();
    const remainingLower = withoutFarmerPrefix.toLowerCase();

    const stillStartsWithFarmer = remainingLower.startsWith(farmerLower) || remainingLower.startsWith(firstWord);

    if (stillStartsWithFarmer && withoutFarmerPrefix.length > firstWord.length) {
      // Farmer prefix appears BOTH at start and embedded in the remaining strain name.
      // Strip the embedded farmer name from the already-stripped result.
      const strippedEmbedded = withoutFarmerPrefix.replace(new RegExp(`^${escapeRegExp(firstWord)}[\s:/-]+`, 'i'), '').trim();
      if (strippedEmbedded && strippedEmbedded.length > 2) {
        return strippedEmbedded;
      }
    }

    // Prefer the longer result (more of the real strain name preserved)
    if (withoutFarmerPrefix && withoutFarmerPrefix.length < rawName.length - 2) {
      return withoutFarmerPrefix;
    }

    return rawName;
  })();

  return (
    <Link
      href={`/strains/${strain.slug}`}
      className={`premium-card ${themeClass} group relative flex w-full min-w-0 rounded-[20px] border-2 bg-[#121212] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden aspect-[4/5]`}
      style={{
        borderColor: themeColor,
        animationDelay: `${index * 0.05}s`,
        animationFillMode: 'both'
      }}
    >
      {/* 1. IMAGE fills entire card — using img tag to bypass Vercel image optimization limit */}
      <img
        src={strain.image_url || "/strains/placeholder-1.svg"}
        alt={strain.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
        referrerPolicy="no-referrer"
      />

      {/* 2. HEADER OVERLAY: Farmer + Strain Name — gradient top */}
      <div className="absolute top-0 left-0 right-0 z-10 px-3 pt-2 pb-0 min-w-0 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
        <p className="text-[7px] font-bold tracking-[0.12em] uppercase text-white/40 truncate">
          {farmerDisplay}
        </p>
        <p className="title-font italic text-[12px] font-black leading-tight uppercase text-white break-words line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {normalizedStrainName}
        </p>
      </div>

      {/* 3. BADGES — centered over image, above stats bar */}
      <div className="absolute bottom-14 left-2 z-20">
        <div
          className="px-1.5 py-0.5 rounded-lg backdrop-blur-md border text-[7px] font-bold uppercase tracking-widest"
          style={{
            backgroundColor: `${themeColor}30`,
            borderColor: `${themeColor}80`,
            color: themeColor,
          }}
        >
          {strain.type === 'sativa' ? 'Sativa' : strain.type === 'indica' ? 'Indica' : 'Hybride'}
        </div>
      </div>
      {isCollected && (
        <div className="absolute bottom-14 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-full backdrop-blur-md border border-[#00F5FF]/30"
          style={{ backgroundColor: '#00F5FF20' }}>
          <div className="w-1 h-1 rounded-full bg-[#00F5FF]" />
          <span className="text-[7px] font-bold uppercase tracking-wider text-[#00F5FF]">In Sammlung</span>
        </div>
      )}
      {hasPrivateNote && (
        <div className="absolute bottom-20 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-full backdrop-blur-md border border-[#ffb000]/40 bg-[#ffb000]/15">
          <span className="text-[7px] font-bold uppercase tracking-wider text-[#ffb000]">Notiz</span>
        </div>
      )}

      {/* 4. STATS BAR — bottom with solid gradient background */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-2 pb-2 pt-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
        <div className="rounded-xl border border-white/10 bg-[#121212]/90 p-1.5 shadow-inner backdrop-blur-sm">
          <div className="grid grid-cols-[0.8fr_0.9fr_1.15fr_1.15fr] gap-1">
            <div className="flex flex-col items-center gap-0">
              <span className="text-[5px] font-bold uppercase tracking-widest text-white/40">THC</span>
              <span className="whitespace-nowrap text-[8px] font-black tracking-normal" style={{ color: themeColor }}>{thcDisplay}</span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1">
              <span className="text-[5px] font-bold uppercase tracking-widest text-white/40">CBD</span>
              <span className="whitespace-nowrap text-[8px] font-black tracking-normal" style={{ color: themeColor }}>{cbdDisplay}</span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1 min-w-0">
              <span className="text-[5px] font-bold uppercase tracking-widest text-white/40">Aroma</span>
              <span className="line-clamp-2 w-full break-words text-center text-[6px] font-bold leading-[0.95] tracking-wide text-white/70">
                {tasteDisplay}
              </span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1 min-w-0">
              <span className="text-[5px] font-bold uppercase tracking-widest text-white/40">Wirkung</span>
              <span className="line-clamp-2 w-full break-words text-center text-[6px] font-bold leading-[0.95] tracking-wide text-white/70">
                {effectDisplay}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});
