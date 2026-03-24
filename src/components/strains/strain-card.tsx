import Link from 'next/link';
import { Strain } from '@/lib/types';
import { Lock, UserRound } from 'lucide-react';

interface StrainCardProps {
  strain: Strain;
  index?: number;
  isCollected?: boolean;
}

export function StrainCard({ strain, index = 0, isCollected = true }: StrainCardProps) {
  const typeStr = (strain.type || '').toLowerCase();
  let themeColor = '#00FFFF';
  let themeClass = 'theme-cyan';
  let underlineBg = 'bg-[#00FFFF]';

  if (typeStr.includes('sativa')) {
    themeColor = '#fbbf24';
    themeClass = 'theme-gold';
    underlineBg = 'bg-[#fbbf24]';
  } else if (typeStr.includes('indica')) {
    themeColor = '#10b981';
    themeClass = 'theme-emerald';
    underlineBg = 'bg-[#10b981]';
  }

  const farmerDisplay = strain.farmer?.trim() || strain.manufacturer?.trim() || strain.brand?.trim() || 'Unbekannter Farmer';

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
      className={`premium-card ${themeClass} ${!isCollected ? 'opacity-70 grayscale-[0.8]' : ''} flex flex-col w-full h-full border-2 rounded-[20px] bg-[#121212] overflow-hidden`}
      style={{
        borderColor: isCollected ? themeColor : '#333',
        animationDelay: `${index * 0.05}s`,
        animationFillMode: 'both'
      }}
    >
      <div className="p-3 pb-2">
        <div className="flex items-start gap-2 min-w-0">
          <UserRound className="mt-0.5 shrink-0 text-white/55" size={12} />
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/40">Farmer</p>
            <h2 className="text-sm font-black leading-tight text-white break-words line-clamp-2">
              {farmerDisplay}
            </h2>
          </div>
        </div>
        <div className={`w-8 h-0.5 mt-2 opacity-70 ${underlineBg}`}></div>
        <p className="mt-2 text-xs font-medium leading-snug text-white/82 break-words line-clamp-2">
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

      <div className="px-2.5 mt-2.5 w-full flex-grow flex flex-col justify-end pb-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 shadow-inner backdrop-blur-sm shadow-md min-h-[84px] flex flex-col justify-center">
          <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/40">Sorte</p>
          <p className="mt-1 text-sm font-semibold leading-snug text-white break-words line-clamp-3">
            {normalizedStrainName}
          </p>
        </div>
      </div>
    </Link>
  );
}
