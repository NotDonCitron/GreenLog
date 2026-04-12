---
phase: 6
plan: 02
type: feature
wave: 2
depends_on:
  - PLAN-01-server-actions-types
files_modified:
  - src/components/grows/dli-calculator.tsx
  - src/components/grows/log-entry-modal.tsx
  - src/components/grows/plant-limit-warning.tsx
  - src/components/grows/phase-badge.tsx
  - src/components/grows/index.ts
autonomous: true
requirements:
  - GROW-05
  - GROW-06
  - GROW-13
---

## Plan 02: UI Components (DLICalculator, LogEntryModal, PlantLimitWarning, PhaseBadge)

### Context

Server actions and types are implemented in Plan 01. This plan builds the reusable UI components.

### Tasks

#### Task 01: DLI Calculator Component

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/strains/filter-panel.tsx (shadcn/ui usage pattern)
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/ui/card.tsx
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/lib/grows/actions.ts (calculateDLI function)
</read_first>

<acceptance_criteria>
- File `src/components/grows/dli-calculator.tsx` exists with default export
- PPFD input (0-2000 umol/m²/s) with number validation
- Light hours input (0-24) with slider or number input
- Preset dropdown loading from `grow_presets` table (autoflower vs photoperiod)
- DLI output displayed (formula: PPFD × LightHours × 0.0036)
- DLI output shows color: green (<30), yellow (30-60), red (>60) for cannabis optimal range
- Props: `onCalculate?: (dli: number, ppfd: number, lightHours: number) => void`
- `'use client'` directive at top
</acceptance_criteria>

<action>
Create `src/components/grows/dli-calculator.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
    if (onCalculate) onCalculate(result, ppfdNum, hoursNum);
  }, [ppfd, lightHours, onCalculate]);

  function handlePresetChange(presetId: string) {
    setSelectedPreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setPpfd(preset.ppfd_value?.toString() || '700');
      setLightHours(preset.light_cycle.split('/')[0] || '18');
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
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="bg-[var(--background)] border border-[var(--border)]/50">
              <SelectValue placeholder="Preset wählen..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map(preset => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name} ({preset.light_cycle})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
```

#### Task 02: LogEntryModal Component

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/ui/dialog.tsx
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/ui/select.tsx
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/app/grows/[id]/page.tsx (existing GrowDetailPage for reference on form structure)
</read_first>

<acceptance_criteria>
- File `src/components/grows/log-entry-modal.tsx` exists with default export
- `entryTypes` prop: `('watering' | 'feeding' | 'note' | 'photo' | 'ph_ec' | 'dli' | 'milestone')[]`
- Dynamic form renders based on selected entry_type (no form when entry_type not in entryTypes)
- watering: amount_liters number input (0.1-50L)
- feeding: nutrient text + amount string + optional EC number
- note: textarea for note_text
- photo: photo_url URL input + optional caption
- ph_ec: ph (0-14, 1 decimal) + ec (0-10, 2 decimals)
- dli: uses DLICalculator component inline
- milestone: phase dropdown (germination/vegetation/flower/flush/harvest) + optional notes
- Callback: `onSubmit(entry_type, content)` passes validated content object
- `onClose` prop to dismiss modal
- `'use client'` directive at top
</acceptance_criteria>

<action>
Create `src/components/grows/log-entry-modal.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DLICalculator } from './dli-calculator';
import { X, Droplets, Leaf, FileText, Camera, Activity, Flag, Zap } from 'lucide-react';
import type { GrowEntryType } from '@/lib/types';

interface LogEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (entry_type: GrowEntryType, content: Record<string, unknown>) => void;
  availableTypes?: GrowEntryType[];
  defaultPlantId?: string;
}

const ALL_TYPES: { value: GrowEntryType; label: string; icon: React.ReactNode }[] = [
  { value: 'watering', label: 'Gießen', icon: <Droplets size={16} /> },
  { value: 'feeding', label: 'Füttern', icon: <Leaf size={16} /> },
  { value: 'note', label: 'Notiz', icon: <FileText size={16} /> },
  { value: 'photo', label: 'Foto', icon: <Camera size={16} /> },
  { value: 'ph_ec', label: 'pH/EC', icon: <Activity size={16} /> },
  { value: 'dli', label: 'DLI', icon: <Zap size={16} /> },
  { value: 'milestone', label: 'Meilenstein', icon: <Flag size={16} /> },
];

const MILESTONE_PHASES = ['germination', 'vegetation', 'flower', 'flush', 'harvest'];

export function LogEntryModal({ open, onClose, onSubmit, availableTypes, defaultPlantId }: LogEntryModalProps) {
  const [selectedType, setSelectedType] = useState<GrowEntryType | null>(null);
  const [content, setContent] = useState<Record<string, unknown>>({});

  // Form fields per type
  const [amountLiters, setAmountLiters] = useState('');
  const [nutrient, setNutrient] = useState('');
  const [feedAmount, setFeedAmount] = useState('');
  const [feedEc, setFeedEc] = useState('');
  const [noteText, setNoteText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [phValue, setPhValue] = useState('');
  const [ecValue, setEcValue] = useState('');
  const [milestonePhase, setMilestonePhase] = useState('');

  const types = availableTypes || ALL_TYPES.map(t => t.value);

  function resetForm() {
    setSelectedType(null);
    setContent({});
    setAmountLiters('');
    setNutrient('');
    setFeedAmount('');
    setFeedEc('');
    setNoteText('');
    setPhotoUrl('');
    setPhotoCaption('');
    setPhValue('');
    setEcValue('');
    setMilestonePhase('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSubmit() {
    if (!selectedType) return;

    let finalContent: Record<string, unknown> = {};

    switch (selectedType) {
      case 'watering':
        finalContent = { amount_liters: parseFloat(amountLiters) || 0 };
        break;
      case 'feeding':
        finalContent = { nutrient, amount: feedAmount, ...(feedEc ? { ec: parseFloat(feedEc) } : {}) };
        break;
      case 'note':
        finalContent = { note_text: noteText };
        break;
      case 'photo':
        finalContent = { photo_url: photoUrl, ...(photoCaption ? { caption: photoCaption } : {}) };
        break;
      case 'ph_ec':
        finalContent = { ph: parseFloat(phValue) || 0, ec: parseFloat(ecValue) || 0 };
        break;
      case 'milestone':
        finalContent = { milestone_phase: milestonePhase };
        break;
      case 'dli':
        finalContent = content; // set by DLICalculator
        break;
    }

    onSubmit(selectedType, finalContent);
    handleClose();
  }

  function isValid(): boolean {
    if (!selectedType) return false;
    switch (selectedType) {
      case 'watering': return parseFloat(amountLiters) > 0;
      case 'feeding': return nutrient.length > 0 && feedAmount.length > 0;
      case 'note': return noteText.trim().length > 0;
      case 'photo': return photoUrl.length > 0;
      case 'ph_ec': return parseFloat(phValue) > 0 && parseFloat(ecValue) >= 0;
      case 'milestone': return milestonePhase.length > 0;
      case 'dli': return !!(content.ppfd && content.light_hours);
      default: return false;
    }
  }

  function renderTypeForm() {
    if (!selectedType) return null;

    return (
      <div className="space-y-4 mt-4">
        {selectedType === 'watering' && (
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
              Wassermenge (Liter)
            </Label>
            <Input
              type="number"
              step={0.1}
              min={0.1}
              max={50}
              value={amountLiters}
              onChange={e => setAmountLiters(e.target.value)}
              placeholder="2.5"
              className="bg-[var(--background)] border border-[var(--border)]/50"
            />
          </div>
        )}

        {selectedType === 'feeding' && (
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                Nährstoff
              </Label>
              <Input
                value={nutrient}
                onChange={e => setNutrient(e.target.value)}
                placeholder="z.B. BioBloom"
                className="bg-[var(--background)] border border-[var(--border)]/50"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                Menge
              </Label>
              <Input
                value={feedAmount}
                onChange={e => setFeedAmount(e.target.value)}
                placeholder="z.B. 5ml/L"
                className="bg-[var(--background)] border border-[var(--border)]/50"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                EC (optional)
              </Label>
              <Input
                type="number"
                step={0.1}
                min={0}
                max={10}
                value={feedEc}
                onChange={e => setFeedEc(e.target.value)}
                placeholder="1.8"
                className="bg-[var(--background)] border border-[var(--border)]/50"
              />
            </div>
          </div>
        )}

        {selectedType === 'note' && (
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
              Notiz
            </Label>
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Was ist passiert?"
              rows={4}
              className="bg-[var(--background)] border border-[var(--border)]/50"
            />
          </div>
        )}

        {selectedType === 'photo' && (
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                Foto URL
              </Label>
              <Input
                type="url"
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="bg-[var(--background)] border border-[var(--border)]/50"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                Bildunterschrift (optional)
              </Label>
              <Input
                value={photoCaption}
                onChange={e => setPhotoCaption(e.target.value)}
                placeholder="Caption..."
                className="bg-[var(--background)] border border-[var(--border)]/50"
              />
            </div>
          </div>
        )}

        {selectedType === 'ph_ec' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                pH Wert
              </Label>
              <Input
                type="number"
                step={0.1}
                min={0}
                max={14}
                value={phValue}
                onChange={e => setPhValue(e.target.value)}
                placeholder="6.2"
                className="bg-[var(--background)] border border-[var(--border)]/50"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                EC (mS/cm)
              </Label>
              <Input
                type="number"
                step={0.01}
                min={0}
                max={10}
                value={ecValue}
                onChange={e => setEcValue(e.target.value)}
                placeholder="1.5"
                className="bg-[var(--background)] border border-[var(--border)]/50"
              />
            </div>
          </div>
        )}

        {selectedType === 'dli' && (
          <DLICalculator
            onCalculate={(dli, ppfd, lightHours) => {
              setContent({ ppfd, light_hours, dli });
            }}
          />
        )}

        {selectedType === 'milestone' && (
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                Phase
              </Label>
              <Select value={milestonePhase} onValueChange={setMilestonePhase}>
                <SelectTrigger className="bg-[var(--background)] border border-[var(--border)]/50">
                  <SelectValue placeholder="Phase wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONE_PHASES.map(p => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[var(--background)] border border-[var(--border)]/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-tight text-[var(--foreground)]">
            Neuer Logeintrag
          </DialogTitle>
        </DialogHeader>

        {!selectedType ? (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {ALL_TYPES.filter(t => types.includes(t.value)).map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#2FF801]/50 transition-all text-[var(--foreground)]"
              >
                <span className="text-[#2FF801]">{type.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">{type.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
                {ALL_TYPES.find(t => t.value === selectedType)?.label}
              </span>
              <button onClick={() => setSelectedType(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X size={16} />
              </button>
            </div>
            {renderTypeForm()}
            <Button
              onClick={handleSubmit}
              disabled={!isValid()}
              className="w-full mt-4 bg-gradient-to-r from-[#2FF801] to-[#2fe000] hover:opacity-90 text-black font-bold"
            >
              Eintrag speichern
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

#### Task 03: PlantLimitWarning Component

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/ui/card.tsx
</read_first>

<acceptance_criteria>
- File `src/components/grows/plant-limit-warning.tsx` exists with default export
- Shows when user already has 3 active plants (KCanG § 9)
- Red warning card with alert icon
- Exact German text: "KCanG § 9: Maximal 3 aktive Pflanzen erlaubt. Ernte oder zerstöre eine Pflanze, bevor du eine neue hinzufügst."
- Dismiss button hides the warning
- Props: `visible: boolean`, `onDismiss: () => void`
- `'use client'` directive at top
</acceptance_criteria>

<action>
Create `src/components/grows/plant-limit-warning.tsx`:

```typescript
'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
```

#### Task 04: PhaseBadge Component

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/ui/badge.tsx
</read_first>

<acceptance_criteria>
- File `src/components/grows/phase-badge.tsx` exists with default export
- Props: `phase: 'germination' | 'vegetation' | 'flower' | 'flush' | 'harvest'`
- Colors per phase: germination=green, vegetation=blue, flower=purple, flush=yellow, harvest=orange
- Small badge with uppercase text (10px)
- `'use client'` directive at top
</acceptance_criteria>

<action>
Create `src/components/grows/phase-badge.tsx`:

```typescript
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
```

#### Task 05: Barrel Export

<read_first>
- /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/ui/badge.tsx (reference for exports)
</read_first>

<acceptance_criteria>
- `src/components/grows/index.ts` exists and exports all 4 components
- `ls src/components/grows/` shows all 5 files (4 components + index.ts)
</acceptance_criteria>

<action>
Create `src/components/grows/index.ts`:

```typescript
export { DLICalculator } from './dli-calculator';
export { LogEntryModal } from './log-entry-modal';
export { PlantLimitWarning } from './plant-limit-warning';
export { PhaseBadge } from './phase-badge';
```

Create the directory:
```bash
mkdir -p src/components/grows
```
</action>

### Verification

```bash
ls -la src/components/grows/
grep -l "DLICalculator\|LogEntryModal\|PlantLimitWarning\|PhaseBadge" src/components/grows/*.tsx
```