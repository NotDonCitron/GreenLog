'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sprout } from 'lucide-react';
import { resolvePublicMediaUrl } from '@/lib/public-media-url';

interface GrowCardImageProps {
  primaryUrl?: string | null;
  secondaryUrl?: string | null;
  alt: string;
  className?: string;
}

function buildCandidates(primaryUrl?: string | null, secondaryUrl?: string | null): string[] {
  const resolvedPrimary = resolvePublicMediaUrl(primaryUrl);
  const resolvedSecondary = resolvePublicMediaUrl(secondaryUrl);
  return [resolvedPrimary, resolvedSecondary].filter((value, index, array): value is string => (
    typeof value === 'string'
    && value.length > 0
    && array.indexOf(value) === index
  ));
}

export function GrowCardImage({ primaryUrl, secondaryUrl, alt, className = 'h-36 w-full' }: GrowCardImageProps) {
  const candidates = useMemo(() => buildCandidates(primaryUrl, secondaryUrl), [primaryUrl, secondaryUrl]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  const activeSource = candidates[candidateIndex];

  if (!activeSource) {
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-[#2FF801]/10 via-[#00F5FF]/10 to-transparent`}>
        <Sprout size={26} className="text-[var(--muted-foreground)]/60" aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={activeSource}
      alt={alt}
      className={`${className} object-cover`}
      onError={() => setCandidateIndex((prev) => prev + 1)}
    />
  );
}
