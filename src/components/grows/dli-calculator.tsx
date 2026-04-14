'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calculator, Sun } from 'lucide-react';
import type { GrowPreset } from '@/lib/types';

interface DLICalculatorProps {
  onCalculate?: (dli: number, ppfd: number, lightHours: number) => void;
  initialPPFD?: number;
  initialLightHours?: number;
}

function calculateDLI(ppfd: number, lightHours: number): number {
  return Math.round(ppfd * lightHours * 0.0036 * 100) / 100;
}

export function DLICalculator({ onCalculate, initialPPFD, initialLightHours }: DLICalculatorProps) {
  const [presets, setPresets] = useState<GrowPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [ppfd, setPpfd] = useState(initialPPFD?.toString() || '700');
  const [lightHours, setLightHours] = useState(initialLightHours?.toString() || '18');
  const [dli, setDli] = useState<number | null>(null);
  const onCalculateRef = useRef(onCalculate);
  onCalculateRef.current = onCalculate;

  useEffect(() => {
    async function loadPresets() {
      const { data } = await supabase
        .from('grow_presets')
        .select('*')
        .eq('is_public', true)
        .order('name');
      if (data) setPresets(data);
    }
    loadPresets();
  }, []);

  useEffect(() => {
    const ppfdNum = parseInt(ppfd) || 0;
    const hoursNum = parseFloat(lightHours) || 0;
    const result = calculateDLI(ppfdNum, hoursNum);
    setDli(result);
    if (onCalculateRef.current) onCalculateRef.current(result, ppfdNum, hoursNum);
  }, [ppfd, lightHours]);

  function handlePresetChange(presetId: string | null) {
    if (!presetId) return;
    setSelectedPreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setPpfd(preset.ppfd_value?.toString() || '700');
      setLightHours(preset.light_cycle?.split('/')[0] || '18');
    }
  }

  function getDLIColor(val: number): string {
    if (val < 25) return 'text-yellow-400';
    if (val <= 50) return 'text-[#2FF801]';
    return 'text-red-400';
  }

  function getDLILabel(val: number): string {
    if (val < 15) return 'Too Low';
    if (val < 25) return 'Seedling';
    if (val <= 35) return 'Optimal Vegetative';
    if (val <= 50) return 'Optimal Flowering';
    if (val <= 65) return 'High Stress';
    return 'Too High';
  }

  return (
    <Card className="p-4 bg-[var(--card)] border border-[var(--border)]/50">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={18} className="text-[#2FF801]" />
        <span className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">DLI Rechner</span>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
            Preset laden
          </Label>
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)]/50 rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-[#2FF801]/50"
          >
            <option value="">Preset wählen...</option>
            {presets.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.light_cycle})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
              PPFD (umol/m²/s)
            </Label>
            <Input
              type="number"
              min={0}
              max={2000}
              value={ppfd}
              onChange={e => setPpfd(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)]/50"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
              Lichtstunden
            </Label>
            <Input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={lightHours}
              onChange={e => setLightHours(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)]/50"
            />
          </div>
        </div>

        {dli !== null && (
          <div className="mt-4 p-4 bg-[var(--background)] rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sun size={16} className={getDLIColor(dli)} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                DLI Ergebnis
              </span>
            </div>
            <div className={`text-4xl font-black font-display ${getDLIColor(dli)}`}>
              {dli}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              mol/m²/day
            </div>
            <div className={`text-xs font-bold mt-2 ${getDLIColor(dli)}`}>
              {getDLILabel(dli)}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
