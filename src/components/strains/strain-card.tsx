import Link from 'next/link';
import { Strain } from '@/lib/types';
import { Lock } from 'lucide-react';

interface StrainCardProps {
  strain: Strain;
  index?: number;
  isCollected?: boolean;
}

export function StrainCard({ strain, index = 0, isCollected = true }: StrainCardProps) {
  // Determine Theme
  const typeStr = (strain.type || '').toLowerCase();

  let themeClass = 'theme-cyan'; // default hybrid
  let imageFilter = '';

  if (typeStr.includes('sativa')) {
    themeClass = 'theme-gold';
    imageFilter = 'saturate-50 contrast-125';
  } else if (typeStr.includes('indica')) {
    themeClass = 'theme-emerald';
    imageFilter = 'grayscale-[0.2]';
  } else {
    themeClass = 'theme-cyan';
  }

  // Type badge color
  let badgeClasses = 'border-[#00FFFF] text-[#00FFFF]';
  if (themeClass === 'theme-gold') badgeClasses = 'border-yellow-500 text-yellow-500';
  if (themeClass === 'theme-emerald') badgeClasses = 'border-emerald-400 text-emerald-400';
  if (themeClass === 'theme-purple') badgeClasses = 'border-purple-400 text-purple-400';
  if (themeClass === 'theme-crimson') badgeClasses = 'border-rose-500 text-rose-500';

  let underlineBg = 'bg-[#00FFFF]';
  if (themeClass === 'theme-gold') underlineBg = 'bg-[#fbbf24]';
  if (themeClass === 'theme-emerald') underlineBg = 'bg-[#10b981]';
  if (themeClass === 'theme-purple') underlineBg = 'bg-[#c084fc]';
  if (themeClass === 'theme-crimson') underlineBg = 'bg-[#f43f5e]';

  const thcValue = strain.avg_thc ?? strain.thc_max;
  const thcDisplay = typeof thcValue === 'number' ? `${thcValue}%` : '—';

  const cbdValue = strain.avg_cbd ?? strain.cbd_max;
  const cbdDisplay = typeof cbdValue === 'number' ? `${cbdValue}%` : '< 1%';

  const normalizedEffects = Array.isArray(strain.effects)
    ? strain.effects
      .map((effect) => (typeof effect === 'string' ? effect : null))
      .filter((effect): effect is string => Boolean(effect))
    : [];

  const normalizedTerpenes = Array.isArray(strain.terpenes)
    ? strain.terpenes
      .map((terpene) => {
        if (typeof terpene === 'string') return terpene;
        if (terpene && typeof terpene === 'object' && 'name' in terpene) {
          const name = (terpene as { name?: unknown }).name;
          return typeof name === 'string' ? name : null;
        }
        return null;
      })
      .filter((terpene): terpene is string => Boolean(terpene))
    : [];

  const effectDisplay = normalizedEffects.length > 0 ? normalizedEffects[0] : 'Euphorie';
  const tasteDisplay = normalizedTerpenes.length > 0 ? normalizedTerpenes.slice(0, 2).join(', ') : 'Zitrus, Erdig';

  const hasNonStringEffects = Array.isArray(strain.effects) && strain.effects.some((effect) => typeof effect !== 'string');
  const hasNonStringTerpenes = Array.isArray(strain.terpenes) && strain.terpenes.some((terpene) => typeof terpene !== 'string');

  if (hasNonStringEffects || hasNonStringTerpenes) {
    console.warn('[StrainCard] Non-string data detected', {
      id: strain.id,
      name: strain.name,
      effects: strain.effects,
      terpenes: strain.terpenes,
    });
  }

  const imgUrl = strain.image_url || "/strains/placeholder-1.svg";
  return (
    <Link
      href={`/strains/${strain.slug}`}
      className={`premium-card ${themeClass} ${!isCollected ? 'opacity-70 grayscale-[0.8]' : ''} flex flex-col w-full h-full animate-in fade-in slide-in-from-bottom-4`}
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
    >
      <div className="p-3 pb-2">
        <h2 className={`title-font italic text-base font-bold leading-tight uppercase drop-shadow-lg line-clamp-2 ${!isCollected ? 'text-white/60' : 'text-white'}`}>
          {strain.name}
        </h2>
        <div className={`w-8 h-0.5 mt-1.5 opacity-70 ${underlineBg}`}></div>
      </div>

      <div className="px-2.5 w-full shrink-0">
        <div className="relative w-full h-[120px] rounded-xl overflow-hidden border border-white/10 shadow-lg">
          <img src={imgUrl} alt={strain.name} className={`w-full h-full object-cover ${imageFilter}`} />
          {!isCollected && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
              <Lock className="text-white/40" size={24} />
            </div>
          )}
          <div className={`absolute bottom-2 left-2 z-20 border bg-black/70 backdrop-blur-md uppercase text-[8px] px-1.5 py-0.5 rounded-sm tracking-wider font-bold shadow-md ${badgeClasses}`}>
            {strain.type || 'HYBRID'}
          </div>
        </div>
      </div>

      <div className="px-2.5 mt-2.5 w-full flex-grow flex flex-col justify-end">
        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 shadow-inner backdrop-blur-sm shadow-md">
          {/* Row 1: THC & Geschmack */}
          <div className="grid grid-cols-2 gap-1.5 border-b border-white/5 pb-1.5 mb-1.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[8px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">THC</span>
              <span className="accent-text text-xs font-bold tracking-wide">{thcDisplay}</span>
            </div>
            <div className="flex items-center justify-end border-l border-white/5 pl-1.5 w-full">
              <span className="text-gray-100 text-[9px] font-medium tracking-wide leading-tight text-right text-balance">{tasteDisplay}</span>
            </div>
          </div>
          {/* Row 2: CBD & Wirkung */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[8px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">CBD</span>
              <span className="accent-text text-xs font-bold tracking-wide">{cbdDisplay}</span>
            </div>
            <div className="flex items-center justify-end border-l border-white/5 pl-1.5 w-full">
              <span className="text-gray-100 text-[9px] font-medium tracking-wide leading-tight text-right text-balance">{effectDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
