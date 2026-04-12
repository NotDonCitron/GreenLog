'use client';

import { Badge } from '@/components/ui/badge';

interface PhaseBadgeProps {
  phase: 'germination' | 'vegetation' | 'flower' | 'flush' | 'harvest';
}

const PHASE_CONFIG = {
  germination: { label: 'Keimung', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  vegetation: { label: 'Vegetation', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  flower: { label: 'Blüte', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  flush: { label: 'Flush', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  harvest: { label: 'Ernte', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

export function PhaseBadge({ phase }: PhaseBadgeProps) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.germination;
  return (
    <Badge className={`${config.className} border text-[10px] font-bold uppercase tracking-wider`}>
      {config.label}
    </Badge>
  );
}
