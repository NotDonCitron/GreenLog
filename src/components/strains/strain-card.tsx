import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Strain } from '@/lib/types';
import { CheckCircle2 } from 'lucide-react';
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
      className={`premium-card ${themeClass} group relative flex w-full min-w-0 flex-col rounded-[20px] border-2 bg-[#121212] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] min-h-[240px]`}
      style={{
        borderColor: themeColor,
        animationDelay: `${index * 0.05}s`,
        animationFillMode: 'both'
      }}
    >
      <div className="p-3 pb-1 min-w-0 relative z-10">
        <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/30 truncate">
          {farmerDisplay}
        </p>
        <p className="title-font italic text-[13px] font-black leading-tight uppercase text-white break-words line-clamp-2">
          {normalizedStrainName}
        </p>
      </div>

      <div className="px-2 w-full relative z-10">
        <div className="relative w-full h-[80px] rounded-xl border border-white/5 shadow-lg">
          <Image
            src={strain.image_url || "/strains/placeholder-1.svg"}
            alt={strain.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
          {isCollected && (
            <div className="absolute top-1 right-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#00F5FF]/20 backdrop-blur-md border border-[#00F5FF]/30">
              <CheckCircle2 className="text-[#00F5FF]" size={10} />
              <span className="text-[6px] font-bold uppercase tracking-wider text-[#00F5FF]">In Sammlung</span>
            </div>
          )}
          <div className="absolute bottom-1 left-1 border bg-black/80 backdrop-blur-md uppercase text-[6px] px-1 py-0.5 rounded-sm font-bold tracking-widest shadow-lg" style={{ borderColor: themeColor, color: themeColor }}>
            {strain.type || 'HYBRID'}
          </div>
        </div>
      </div>

      <div className="mt-2 px-3 w-full min-w-0 flex-col justify-start pb-3 relative z-10">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-inner backdrop-blur-sm">
          {/* Row 1: THC & Taste */}
          <div className="mb-2 grid min-w-0 grid-cols-2 gap-2 border-b border-white/5 pb-2">
            <div className="flex min-w-0 items-center gap-1">
              <span className="text-[7px] font-bold uppercase tracking-widest text-white/20">THC</span>
              <span className="text-[9px] font-black tracking-wide" style={{ color: themeColor }}>{thcDisplay}</span>
            </div>
            <div className="flex min-w-0 items-center justify-end border-l border-white/5 pl-2 text-right">
              <span className="text-[8px] font-medium tracking-wide text-white/80 leading-tight">{tasteDisplay}</span>
            </div>
          </div>

          {/* Row 2: CBD & Effect */}
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <span className="text-[7px] font-bold uppercase tracking-widest text-white/20">CBD</span>
              <span className="text-[9px] font-black tracking-wide" style={{ color: themeColor }}>{cbdDisplay}</span>
            </div>
            <div className="flex min-w-0 items-center justify-end border-l border-white/5 pl-2 text-right">
              <span className="text-[8px] font-medium tracking-wide text-white/80 leading-tight">{effectDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});
