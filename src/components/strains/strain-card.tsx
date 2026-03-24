import Link from 'next/link';
import { Strain } from '@/lib/types';
import { Lock } from 'lucide-react';

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

  const thcValue = strain.avg_thc ?? strain.thc_max;
  const thcDisplay = typeof thcValue === 'number' ? `${thcValue}%` : '—';
  const cbdDisplay = strain.avg_cbd ? `${strain.avg_cbd}%` : '< 1%';

  const extractDisplayName = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return null;
    if ('name' in value) return (value as any).name;
    if ('label' in value) return (value as any).label;
    return null;
  };

  const normalizedEffects = Array.isArray(strain.effects) ? strain.effects.map(e => extractDisplayName(e)).filter(Boolean) : [];
  const normalizedFlavors = Array.isArray(strain.flavors) ? strain.flavors.map(f => extractDisplayName(f)).filter(Boolean) : [];

  const effectDisplay = normalizedEffects.length > 0 ? normalizedEffects[0] : 'Euphorie';
  const tasteDisplay = normalizedFlavors.length > 0 ? normalizedFlavors.slice(0, 2).join(', ') : 'Zitrus, Erdig';

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
        <h2 className="title-font italic text-sm font-bold leading-tight uppercase text-white line-clamp-1">
          {strain.name}
        </h2>
        <div className={`w-8 h-0.5 mt-1 opacity-70 ${underlineBg}`}></div>
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
        <div className="bg-white/5 border border-white/10 rounded-xl p-2 shadow-inner backdrop-blur-sm shadow-md">
          {/* Row 1: THC & Geschmack */}
          <div className="grid grid-cols-2 gap-2 border-b border-white/5 pb-1.5 mb-1.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[7px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">THC</span>
              <span className="text-[10px] font-bold tracking-wide" style={{ color: themeColor }}>{thcDisplay}</span>
            </div>
            <div className="flex items-center justify-end border-l border-white/5 pl-2 w-full text-right">
              <span className="text-gray-100 text-[8px] font-medium tracking-wide truncate">{tasteDisplay}</span>
            </div>
          </div>
          {/* Row 2: CBD & Wirkung */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[7px] uppercase tracking-widest font-semibold flex-shrink-0 mr-1">CBD</span>
              <span className="text-[10px] font-bold tracking-wide" style={{ color: themeColor }}>{cbdDisplay}</span>
            </div>
            <div className="flex items-center justify-end border-l border-white/5 pl-2 w-full text-right">
              <span className="text-gray-100 text-[8px] font-medium tracking-wide truncate">{effectDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
