'use client';

import { Badge } from '@/components/ui/badge';
import type { PlantStatus } from '@/lib/types';

interface PhaseBadgeProps {
  status: PlantStatus;
}

const PHASE_CONFIG: Record<PlantStatus, { label: string; className: string }> = {
  seedling: { label: 'Keimung', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  vegetative: { label: 'Vegetation', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  flowering: { label: 'Blüte', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  flushing: { label: 'Flush', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  harvested: { label: 'Ernte', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  destroyed: { label: 'Vernichtet', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export function PhaseBadge({ status }: PhaseBadgeProps) {
  const config = PHASE_CONFIG[status] || PHASE_CONFIG.seedling;
  return (
    <Badge className={`${config.className} border text-[10px] font-bold uppercase tracking-wider`}>
      {config.label}
    </Badge>
  );
}
