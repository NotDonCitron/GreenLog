import Link from 'next/link';
import { Strain } from '@/lib/types';
import { Lock } from 'lucide-react';
import { formatPercent, getEffectDisplay, getStrainTheme, getTasteDisplay } from '@/lib/strain-display';

interface StrainCardProps {
  strain: Strain;
  index?: number;
  isCollected?: boolean;
}

export function StrainCard({ strain, index = 0, isCollected = true }: StrainCardProps) {
  const { color: themeColor, className: themeClass, underlineClass: underlineBg } = getStrainTheme(strain.type);

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
      className={`premium-card ${themeClass} ${!isCollected ? 'opacity-70 grayscale-[0.8]' : ''} flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[20px] border-2 bg-[#121212]`}
      style={{
        borderColor: isCollected ? themeColor : '#333',
        animationDelay: `${index * 0.05}s`,
        animationFillMode: 'both'
      }}
    >
      <div className="p-3 pb-2 min-w-0">
        <h2 className="title-font italic text-sm font-bold leading-tight uppercase text-white break-words line-clamp-2">
          {farmerDisplay}
        </h2>
        <div className={`w-8 h-0.5 mt-1 opacity-70 ${underlineBg}`}></div>
        <p className="mt-2 title-font italic text-sm font-bold leading-tight uppercase text-white/90 break-words line-clamp-2 min-h-[2.5rem]">
          {normalizedStrainName}
        </p>
      </div>

      <div className="px-2.5 w-full shrink-0">
        <div className="relative w-full h-[100px] rounded-xl overflow-hidden border border-white/10 shadow-lg">
          <img src={strain.image_url || "/strains/placeholder-1.svg"} alt={strain.name} className="w-full h-full object-cover" />
          {!isCollected && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
              <Lock className="text-white/20" size={20} />
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 border bg-black/70 backdrop-blur-md uppercase text-[7px] px-1.5 py-0.5 rounded-sm font-bold" style={{ borderColor: themeColor, color: themeColor }}>
            {strain.type || 'HYBRID'}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex w-full min-w-0 flex-grow flex-col justify-end px-2.5 pb-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 shadow-inner shadow-md backdrop-blur-sm">
          <div className="mb-1.5 grid min-w-0 grid-cols-2 gap-2 border-b border-white/5 pb-1.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="flex-shrink-0 text-[7px] font-semibold uppercase tracking-widest text-gray-500">THC</span>
              <span className="truncate text-[10px] font-bold tracking-wide" style={{ color: themeColor }}>{thcDisplay}</span>
            </div>
            <div className="flex min-w-0 w-full items-center justify-end border-l border-white/5 pl-2 text-right">
              <span className="line-clamp-2 break-words text-[8px] font-medium tracking-wide text-gray-100 [overflow-wrap:anywhere]">{tasteDisplay}</span>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="flex-shrink-0 text-[7px] font-semibold uppercase tracking-widest text-gray-500">CBD</span>
              <span className="truncate text-[10px] font-bold tracking-wide" style={{ color: themeColor }}>{cbdDisplay}</span>
            </div>
            <div className="flex min-w-0 w-full items-center justify-end border-l border-white/5 pl-2 text-right">
              <span className="line-clamp-2 break-words text-[8px] font-medium tracking-wide text-gray-100 [overflow-wrap:anywhere]">{effectDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
