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
      className={`premium-card ${themeClass} ${!isCollected ? 'opacity-70 grayscale-[0.8]' : ''} group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[20px] border-2 bg-[#121212] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]`}
      style={{
        borderColor: isCollected ? themeColor : '#333',
        animationDelay: `${index * 0.05}s`,
        animationFillMode: 'both'
      }}
    >
      <div className="p-3.5 pb-2 min-w-0 relative z-10">
        <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 truncate">
          {farmerDisplay}
        </h2>
        <p className="mt-1 title-font italic text-sm font-black leading-tight uppercase text-white break-words line-clamp-2 min-h-[2.5rem]">
          {normalizedStrainName}
        </p>
      </div>

      <div className="px-3 w-full shrink-0 relative z-10">
        <div className="relative w-full h-[110px] rounded-xl overflow-hidden border border-white/5 shadow-lg">
          <img 
            src={strain.image_url || "/strains/placeholder-1.svg"} 
            alt={strain.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
          {!isCollected && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[1.5px]">
              <Lock className="text-white/20" size={20} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 border bg-black/80 backdrop-blur-md uppercase text-[7px] px-1.5 py-0.5 rounded-sm font-bold tracking-widest shadow-lg" style={{ borderColor: themeColor, color: themeColor }}>
            {strain.type || 'HYBRID'}
          </div>
        </div>
      </div>

      <div className="mt-3 flex w-full min-w-0 flex-grow flex-col justify-end px-3 pb-3.5 relative z-10">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-inner backdrop-blur-sm">
          {/* Row 1: THC & Taste */}
          <div className="mb-2 grid min-w-0 grid-cols-2 gap-2 border-b border-white/5 pb-2">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="flex-shrink-0 text-[7px] font-bold uppercase tracking-widest text-white/20">THC</span>
              <span className="truncate text-[10px] font-black tracking-wide" style={{ color: themeColor }}>{thcDisplay}</span>
            </div>
            <div className="flex min-w-0 w-full items-center justify-end border-l border-white/5 pl-2 text-right">
              <span className="truncate text-[9px] font-medium tracking-wide text-white/80">{tasteDisplay}</span>
            </div>
          </div>
          
          {/* Row 2: CBD & Effect */}
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="flex-shrink-0 text-[7px] font-bold uppercase tracking-widest text-white/20">CBD</span>
              <span className="truncate text-[10px] font-black tracking-wide" style={{ color: themeColor }}>{cbdDisplay}</span>
            </div>
            <div className="flex min-w-0 w-full items-center justify-end border-l border-white/5 pl-2 text-right">
              <span className="truncate text-[9px] font-medium tracking-wide text-white/80">{effectDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
