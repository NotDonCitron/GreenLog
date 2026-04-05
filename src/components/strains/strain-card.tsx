import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

  const farmerDisplay = strain.farmer?.trim() || strain.manufacturer?.trim() || strain.brand?.trim() || 'Unbekannter Farmer';
  const thcDisplay = formatPercent(strain.avg_thc ?? strain.thc_max, '—');
  const cbdDisplay = formatPercent(strain.avg_cbd ?? strain.cbd_max, '< 1%');
  const effectDisplay = getEffectDisplay(strain);
  const tasteDisplay = getTasteDisplay(strain);

  // Strip farmer prefix from strain name — handles "420 Pharma: Natural Gorilla Glue" -> "Natural Gorilla Glue"
  // and "420 Natural Gorilla Glue" (farmer="420 Pharma") -> "Natural Gorilla Glue"
  const normalizedStrainName = (() => {
    const rawName = strain.name?.trim() || '';

    if (!rawName || farmerDisplay === 'Unbekannter Farmer') {
      return rawName;
    }

    // Try stripping the full farmer name (e.g., "420 Pharma: " from "420 Pharma: Natural Gorilla Glue")
    const withoutFarmerPrefix = rawName.replace(
      new RegExp(`^${escapeRegExp(farmerDisplay)}[\s:/-]*`, 'i'),
      ''
    ).trim();

    // If result is empty/too short, the farmer might be the first word (e.g., farmer="420 Pharma", name="420 Natural Gorilla Glue")
    if (!withoutFarmerPrefix || withoutFarmerPrefix.length < 3) {
      const firstWord = farmerDisplay.split(/\s+/)[0];
      if (firstWord && firstWord.length > 1) {
        const withoutFirstWord = rawName.replace(new RegExp(`^${escapeRegExp(firstWord)}[\s:/-]+`, 'i'), '').trim();
        // Only use if it's meaningfully different from rawName and from the first attempt
        if (withoutFirstWord &&
            withoutFirstWord.length > withoutFarmerPrefix.length &&
            withoutFirstWord.length < rawName.length - 2) {
          return withoutFirstWord;
        }
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
      {/* 1. IMAGE fills entire card */}
      <Image
        src={strain.image_url || "/strains/placeholder-1.svg"}
        alt={strain.name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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

      {/* 4. STATS BAR — bottom with solid gradient background */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-2 pb-2 pt-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
        <div className="rounded-xl border border-white/10 bg-[#121212]/90 p-1.5 shadow-inner backdrop-blur-sm">
          <div className="grid grid-cols-4 gap-1">
            <div className="flex flex-col items-center gap-0">
              <span className="text-[5px] font-bold uppercase tracking-widest text-white/40">THC</span>
              <span className="text-[8px] font-black tracking-wide" style={{ color: themeColor }}>{thcDisplay}</span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1">
              <span className="text-[5px] font-bold uppercase tracking-widest text-white/40">CBD</span>
              <span className="text-[8px] font-black tracking-wide" style={{ color: themeColor }}>{cbdDisplay}</span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1 min-w-0">
              <span className="text-[6px] font-medium tracking-wide text-white/60 leading-tight break-words text-left w-full">{tasteDisplay}</span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1 min-w-0">
              <span className="text-[6px] font-medium tracking-wide text-white/60 leading-tight break-words text-left w-full">{effectDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});
