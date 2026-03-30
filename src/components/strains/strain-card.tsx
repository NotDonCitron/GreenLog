import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Strain } from '@/lib/types';
import { formatPercent, getEffectDisplay, getStrainTheme, getTasteDisplay } from '@/lib/strain-display';

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

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normalizedStrainName = (() => {
    const rawName = strain.name?.trim() || '';

    if (!rawName || farmerDisplay === 'Unbekannter Farmer') {
      return rawName;
    }

    const withoutFarmerPrefix = rawName.replace(
      new RegExp(`^${escapeRegExp(farmerDisplay)}[\s:/-]*`, 'i'),
      ''
    ).trim();

    return withoutFarmerPrefix || rawName;
  })();

  return (
    <Link
      href={`/strains/${strain.slug}`}
      className={`premium-card ${themeClass} group relative flex w-full min-w-0 flex-col rounded-[20px] border-2 bg-[#121212] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden aspect-[4/5]`}
      style={{
        borderColor: themeColor,
        animationDelay: `${index * 0.05}s`,
        animationFillMode: 'both'
      }}
    >
      {/* 1. HEADER: Farmer + Strain Name */}
      <div className="shrink-0 p-3 pb-1 min-w-0 relative z-10">
        <p className="text-[8px] font-bold tracking-[0.12em] uppercase text-[var(--foreground)]/30">
          {farmerDisplay}
        </p>
        <p className="title-font italic text-[14px] font-black leading-tight uppercase text-[var(--foreground)] break-words">
          {normalizedStrainName}
        </p>
      </div>

      {/* 2. IMAGE with 2 badges only */}
      <div className="relative flex-1 min-h-0 px-2 py-1 z-10">
        <div className="absolute inset-0 rounded-xl border border-white/5 shadow-lg overflow-hidden">
          <Image
            src={strain.image_url || "/strains/placeholder-1.svg"}
            alt={strain.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, 33vw"
            loading="lazy"
          />
          {/* Type Badge — top left */}
          <div
            className="absolute top-2 left-2 px-2 py-1 rounded-xl backdrop-blur-md border text-[8px] font-bold uppercase tracking-widest"
            style={{
              backgroundColor: `${themeColor}20`,
              borderColor: `${themeColor}80`,
              color: themeColor,
            }}
          >
            {strain.type || 'HYBRID'}
          </div>
          {/* In Sammlung Badge — top right */}
          {isCollected && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md border border-[#00F5FF]/30"
              style={{ backgroundColor: '#00F5FF20' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#00F5FF]" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-[#00F5FF]">In Sammlung</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. STATS BAR — full text, no truncate */}
      <div className="shrink-0 px-3 w-full relative z-10">
        <div className="rounded-xl border border-white/10 bg-[#121212]/80 p-2 shadow-inner backdrop-blur-sm">
          <div className="grid grid-cols-4 gap-1">
            <div className="flex flex-col items-center gap-0">
              <span className="text-[6px] font-bold uppercase tracking-widest text-[var(--foreground)]/30">THC</span>
              <span className="text-[9px] font-black tracking-wide" style={{ color: themeColor }}>{thcDisplay}</span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1">
              <span className="text-[6px] font-bold uppercase tracking-widest text-[var(--foreground)]/30">CBD</span>
              <span className="text-[9px] font-black tracking-wide" style={{ color: themeColor }}>{cbdDisplay}</span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1">
              <span className="text-[6px] font-bold uppercase tracking-widest text-[var(--foreground)]/30">TASTE</span>
              <span className="text-[8px] font-medium tracking-wide text-[var(--foreground)]/70">{tasteDisplay}</span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1">
              <span className="text-[6px] font-bold uppercase tracking-widest text-[var(--foreground)]/30">EFF</span>
              <span className="text-[8px] font-medium tracking-wide text-[var(--foreground)]/70">{effectDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});
