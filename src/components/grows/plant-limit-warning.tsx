'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface PlantLimitWarningProps {
  visible: boolean;
  onDismiss: () => void;
}

export function PlantLimitWarning({ visible, onDismiss }: PlantLimitWarningProps) {
  if (!visible) return null;

  return (
    <Card className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-bold text-red-400 uppercase tracking-wider mb-1">
            KCanG § 9 Limit erreicht
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Maximal 3 aktive Pflanzen erlaubt. Ernte oder zerstöre eine Pflanze, bevor du eine neue hinzufügst.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </Card>
  );
}
