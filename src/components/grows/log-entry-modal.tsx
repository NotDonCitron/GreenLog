'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DLICalculator } from './dli-calculator';
import { useToast } from '@/components/toast-provider';
import { supabase } from '@/lib/supabase';
import { X, Droplets, Leaf, FileText, Camera, Activity, Flag, Zap } from 'lucide-react';
import type { GrowEntryType, Plant, PlantStatus } from '@/lib/types';

interface LogEntryModalProps {
  open: boolean;
  onClose: () => void;
  growId: string;
  plantId?: string | null;
  plants?: Plant[];
  onEntryAdded: () => void;
  availableTypes?: GrowEntryType[];
  defaultType?: GrowEntryType | null;
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
const ACTIVE_STATUSES: PlantStatus[] = ['seedling', 'vegetative', 'flowering', 'flushing'];
const PLANT_SCOPED_TYPES: GrowEntryType[] = ['watering', 'feeding', 'note', 'photo', 'ph_ec'];

export function LogEntryModal({ open, onClose, growId, plantId, plants = [], onEntryAdded, availableTypes, defaultType }: LogEntryModalProps) {
  const [selectedType, setSelectedType] = useState<GrowEntryType | null>(null);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);
  const toast = useToast();
  const activePlants = useMemo(() => plants.filter(plant => ACTIVE_STATUSES.includes(plant.status)), [plants]);
  const activePlantIds = useMemo(() => activePlants.map(plant => plant.id), [activePlants]);
  const activePlantIdsKey = activePlantIds.join('|');
  const isPlantScoped = selectedType ? PLANT_SCOPED_TYPES.includes(selectedType) : false;
  const showPlantSelector = isPlantScoped && activePlants.length > 1;

  // Auto-select type when modal opens with defaultType
  useEffect(() => {
    if (open && defaultType) {
      const allTypes = ALL_TYPES.map(t => t.value);
      const types = availableTypes || allTypes;
      if (types.includes(defaultType)) {
        setSelectedType(defaultType);
      }
    }
  }, [open, defaultType, availableTypes]);

  useEffect(() => {
    if (!open) return;
    if (plantId && activePlantIds.includes(plantId)) {
      setSelectedPlantIds([plantId]);
      return;
    }
    setSelectedPlantIds(activePlantIds);
  }, [open, plantId, activePlantIds, activePlantIdsKey]);

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
    setSelectedPlantIds(activePlantIds);
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

  async function handleSubmit() {
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

    const affectedPlantIds = isPlantScoped ? selectedPlantIds : [];
    if (affectedPlantIds.length > 0) {
      finalContent = { ...finalContent, affected_plant_ids: affectedPlantIds };
    }

    // Call API to add log entry — include Supabase session token
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }

    const response = await fetch('/api/grows/log-entry', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        grow_id: growId,
        plant_id: affectedPlantIds.length === 1 ? affectedPlantIds[0] : null,
        affected_plant_ids: affectedPlantIds,
        entry_type: selectedType,
        content: finalContent,
      }),
    });

    if (response.ok) {
      onEntryAdded();
      handleClose();
    } else {
      const err = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      console.error('[LogEntryModal] Log entry failed:', err);
      toast.error(err?.error?.message || 'Fehler beim Speichern');
    }
  }

  function isValid(): boolean {
    if (!selectedType) return false;
    if (isPlantScoped && activePlants.length > 0 && selectedPlantIds.length === 0) return false;
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

  function togglePlant(plantIdToToggle: string) {
    setSelectedPlantIds(prev => (
      prev.includes(plantIdToToggle)
        ? prev.filter(id => id !== plantIdToToggle)
        : [...prev, plantIdToToggle]
    ));
  }

  function toggleAllPlants() {
    setSelectedPlantIds(prev => (
      prev.length === activePlantIds.length ? [] : activePlantIds
    ));
  }

  function renderPlantSelector() {
    if (!showPlantSelector) return null;

    const allSelected = selectedPlantIds.length === activePlants.length;

    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
            Betroffene Pflanzen
          </Label>
          <button
            type="button"
            onClick={toggleAllPlants}
            className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase transition-colors ${
              allSelected
                ? 'border-[#2FF801]/50 bg-[#2FF801]/15 text-[#2FF801]'
                : 'border-[var(--border)]/50 text-[var(--muted-foreground)]'
            }`}
          >
            Alle
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {activePlants.map((plant, index) => {
            const isSelected = selectedPlantIds.includes(plant.id);
            return (
              <button
                key={plant.id}
                type="button"
                onClick={() => togglePlant(plant.id)}
                className={`min-w-0 rounded-lg border p-2 text-left transition-all ${
                  isSelected
                    ? 'border-[#2FF801]/60 bg-[#2FF801]/10 text-[var(--foreground)]'
                    : 'border-[var(--border)]/50 bg-[var(--card)] text-[var(--muted-foreground)]'
                }`}
              >
                <span className="block text-[9px] font-black uppercase text-[#2FF801]">
                  Pflanze {index + 1}
                </span>
                <span className="block truncate text-[11px] font-bold">
                  {plant.plant_name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
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
              setContent({ ppfd, light_hours: lightHours, dli });
            }}
          />
        )}

        {selectedType === 'milestone' && (
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                Phase
              </Label>
              <select
                value={milestonePhase}
                onChange={(e) => setMilestonePhase(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)]/50 rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-[#2FF801]/50"
              >
                <option value="">Phase wählen...</option>
                {MILESTONE_PHASES.map(p => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
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
            {renderPlantSelector()}
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
