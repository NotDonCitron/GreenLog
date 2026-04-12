'use client';

import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function KCanGDisclaimer() {
  return (
    <Card className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-300 font-medium leading-relaxed">
          Wissensaustausch für den legalen Eigenanbau nach KCanG. Der Handel oder die Weitergabe von privat angebautem Cannabis an Dritte ist gesetzlich verboten (§ 9 Abs. 2 KCanG).
        </p>
      </div>
    </Card>
  );
}
