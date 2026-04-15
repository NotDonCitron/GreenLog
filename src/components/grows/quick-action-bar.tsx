'use client';

import { Droplets, Leaf, Camera, FileText, Plus } from 'lucide-react';
import type { GrowEntryType } from '@/lib/types';

const QUICK_ACTIONS: { type: GrowEntryType; label: string; icon: typeof Droplets; color: string }[] = [
  { type: 'watering', label: 'Gießen', icon: Droplets, color: 'text-blue-400' },
  { type: 'feeding', label: 'Füttern', icon: Leaf, color: 'text-green-400' },
  { type: 'photo', label: 'Foto', icon: Camera, color: 'text-pink-400' },
  { type: 'note', label: 'Notiz', icon: FileText, color: 'text-yellow-400' },
];

interface Props {
  onAction: (type: GrowEntryType) => void;
  onMore: () => void;
}

export function QuickActionBar({ onAction, onMore }: Props) {
  return (
    <div className="sticky top-[76px] z-50 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--border)]/50 -mx-6 px-6 py-3">
      <div className="flex items-center gap-2">
        {QUICK_ACTIONS.map(({ type, label, icon: Icon, color }) => (
          <button
            key={type}
            onClick={(e) => { e.stopPropagation(); onAction(type); }}
            className="flex-1 flex flex-col items-center gap-1 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#2FF801]/50 transition-all"
          >
            <Icon size={18} className={color} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</span>
          </button>
        ))}
        <button
          onClick={(e) => { e.stopPropagation(); onMore(); }}
          className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all"
        >
          <Plus size={18} className="text-[#00F5FF]" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Mehr</span>
        </button>
      </div>
    </div>
  );
}
