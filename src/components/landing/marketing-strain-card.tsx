"use client";

import { memo } from 'react';
import Link from 'next/link';
import { Strain } from '@/lib/types';
import { formatPercent, getEffectDisplay, getStrainTheme, getTasteDisplay } from '@/lib/strain-display';
import { escapeRegExp } from '@/lib/string-utils';

interface MarketingStrainCardProps {
  strain: Strain;
}

export const MarketingStrainCard = memo(function MarketingStrainCard({ strain }: MarketingStrainCardProps) {
  const { color: themeColor } = getStrainTheme(strain.type);

  const farmerDisplay = strain.farmer?.trim() || strain.manufacturer?.trim() || strain.brand?.trim() || 'Unbekannter Farmer';
  const thcDisplay = formatPercent(strain.avg_thc ?? strain.thc_max, '—');
  const tasteDisplay = getTasteDisplay(strain);
  const effectDisplay = getEffectDisplay(strain);

  // Strip farmer prefix from strain name
  const normalizedStrainName = (() => {
    const rawName = strain.name?.trim() || '';

    if (!rawName || farmerDisplay === 'Unbekannter Farmer') {
      return rawName;
    }

    const withoutFarmerPrefix = rawName.replace(
      new RegExp(`^${escapeRegExp(farmerDisplay)}[\s:/-]*`, 'i'),
      ''
    ).trim();

    if (!withoutFarmerPrefix || withoutFarmerPrefix.length < 3) {
      const firstWord = farmerDisplay.split(/\s+/)[0];
      if (firstWord && firstWord.length > 1) {
        const withoutFirstWord = rawName.replace(new RegExp(`^${escapeRegExp(firstWord)}[\s:/-]+`, 'i'), '').trim();
        if (withoutFirstWord &&
            withoutFirstWord.length > withoutFarmerPrefix.length &&
            withoutFirstWord.length < rawName.length - 2) {
          return withoutFirstWord;
        }
      }
    }

    if (withoutFarmerPrefix && withoutFarmerPrefix.length < rawName.length - 2) {
      return withoutFarmerPrefix;
    }

    return rawName;
  })();

  return (
    <Link
      href={`/strains/${strain.slug}`}
      className="group relative flex w-full min-w-0 flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-white border border-gray-200"
    >
      {/* Image with gradient overlay — using img tag to bypass Vercel image optimization limit */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={strain.image_url || "/strains/placeholder-1.svg"}
          alt={strain.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Type badge — top left */}
        <div
          className="absolute top-2 left-2 px-2.5 py-1 rounded-xl backdrop-blur-md border text-[9px] font-bold uppercase tracking-widest"
          style={{
            backgroundColor: `${themeColor}30`,
            borderColor: themeColor,
            color: themeColor,
          }}
        >
          {strain.type === 'sativa' ? 'Sativa' : strain.type === 'indica' ? 'Indica' : 'Hybride'}
        </div>

        {/* THC badge — top right */}
        <div
          className="absolute top-2 right-2 px-2.5 py-1 rounded-xl backdrop-blur-md border text-[9px] font-black uppercase tracking-wider"
          style={{
            backgroundColor: `${themeColor}30`,
            borderColor: themeColor,
            color: 'white',
          }}
        >
          {thcDisplay}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1">
        <p className="text-[8px] font-bold tracking-[0.12em] uppercase text-gray-500 truncate">
          {farmerDisplay}
        </p>
        <p className="title-font italic text-[13px] font-black leading-tight uppercase text-gray-900 break-words line-clamp-2">
          {normalizedStrainName}
        </p>

        {/* Taste & Effect */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[8px] font-medium text-gray-500 truncate">{tasteDisplay}</span>
          <span className="text-gray-300">•</span>
          <span className="text-[8px] font-medium text-gray-500 truncate">{effectDisplay}</span>
        </div>
      </div>
    </Link>
  );
});
