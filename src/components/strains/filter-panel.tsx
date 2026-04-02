"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RangeSlider } from "./range-slider";
import { EFFECT_OPTIONS, FLAVOR_OPTIONS, THC_RANGE, CBD_RANGE } from "@/lib/constants";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function SavePresetButton({ hasActiveFilters, onClick }: { hasActiveFilters: boolean; onClick: () => void }) {
  return (
    <button
      onClick={() => hasActiveFilters && onClick()}
      disabled={!hasActiveFilters}
      className={`w-full py-1.5 px-2 rounded-lg text-[10px] font-bold border border-dashed transition-all ${
        hasActiveFilters
          ? "border-[#333] text-[#484849] hover:border-[#2FF801]/50 hover:text-[#2FF801]"
          : "border-[#333] text-[#484849]/30 cursor-not-allowed opacity-50"
      }`}
    >
      + Aktuelles speichern
    </button>
  );
}

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterPanel({ open, onOpenChange }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // URL params store English values for DB matching
  const initialEffects = searchParams.get("effects")?.split(",").filter(Boolean) || [];
  const initialThcMin = Number(searchParams.get("thc_min") || THC_RANGE.min);
  const initialThcMax = Number(searchParams.get("thc_max") || THC_RANGE.max);
  const initialCbdMin = Number(searchParams.get("cbd_min") || CBD_RANGE.min);
  const initialCbdMax = Number(searchParams.get("cbd_max") || CBD_RANGE.max);
  const initialFlavors = searchParams.get("flavors")?.split(",").filter(Boolean) || [];

  const [selectedEffects, setSelectedEffects] = useState<string[]>(initialEffects);
  const [thcRange, setThcRange] = useState<[number, number]>([initialThcMin, initialThcMax]);
  const [cbdRange, setCbdRange] = useState<[number, number]>([initialCbdMin, initialCbdMax]);
  const [effectSearch, setEffectSearch] = useState("");
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(initialFlavors);
  const [flavorSearch, setFlavorSearch] = useState("");

  // Preset state
  const [presets, setPresets] = useState<Array<{
    id: string; name: string; effects: string[]; flavors: string[];
    thc_min: number; thc_max: number; cbd_min: number; cbd_max: number;
  }>>([]);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [presetSaveError, setPresetSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    async function loadPresets() {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/filter-presets", { headers });
      if (res.ok) {
        const json = await res.json();
        setPresets(json.data || []);
      }
    }
    void loadPresets();
  }, [open]);

  // Filter by German label for display
  const filteredEffects = EFFECT_OPTIONS.filter((opt) =>
    opt.label.toLowerCase().includes(effectSearch.toLowerCase())
  );

  const filteredFlavors = FLAVOR_OPTIONS.filter((opt) =>
    opt.label.toLowerCase().includes(flavorSearch.toLowerCase())
  );

  const toggleEffect = (value: string) => {
    setSelectedEffects((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]
    );
  };

  const toggleFlavor = (value: string) => {
    setSelectedFlavors((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (selectedEffects.length > 0) params.set("effects", selectedEffects.join(","));
    if (thcRange[0] !== THC_RANGE.min) params.set("thc_min", thcRange[0].toString());
    if (thcRange[1] !== THC_RANGE.max) params.set("thc_max", thcRange[1].toString());
    if (cbdRange[0] !== CBD_RANGE.min) params.set("cbd_min", cbdRange[0].toString());
    if (cbdRange[1] !== CBD_RANGE.max) params.set("cbd_max", cbdRange[1].toString());
    if (selectedFlavors.length > 0) params.set("flavors", selectedFlavors.join(","));
    const queryString = params.toString();
    router.push(`/strains${queryString ? `?${queryString}` : ""}`, { scroll: false });
    onOpenChange(false);
  };

  const resetFilters = () => {
    setSelectedEffects([]);
    setThcRange([THC_RANGE.min, THC_RANGE.max]);
    setCbdRange([CBD_RANGE.min, CBD_RANGE.max]);
    setEffectSearch("");
    setSelectedFlavors([]);
    setFlavorSearch("");
  };

  const savePreset = async () => {
    if (!newPresetName.trim()) return;
    setPresetSaveError(null);
    const headers = await getAuthHeaders();
    const res = await fetch("/api/filter-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        name: newPresetName.trim(),
        effects: selectedEffects,
        flavors: selectedFlavors,
        thc_min: thcRange[0],
        thc_max: thcRange[1],
        cbd_min: cbdRange[0],
        cbd_max: cbdRange[1],
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setPresets([json.data, ...presets]);
      setSavingPreset(false);
      setNewPresetName("");
    } else {
      const err = await res.json().catch(() => ({ error: { message: "Speichern fehlgeschlagen" } }));
      const errorMessage = typeof err.error === "string" ? err.error : err.error?.message || "Speichern fehlgeschlagen";
      setPresetSaveError(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed right-0 top-0 h-full w-full max-w-[320px] m-0 rounded-l-2xl border-l border-[var(--border)] bg-[var(--card)] p-6 flex flex-col gap-6 overflow-y-auto"
        style={{ animation: "slideInFromRight 0.2s ease-out" }}
      >
        <style jsx>{`
          @keyframes slideInFromRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[#2FF801]" />
            <DialogTitle className="text-lg font-bold">Filter</DialogTitle>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-sm opacity-70 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        {/* Effects */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Effects</h3>
          <Input
            placeholder="Filter..."
            value={effectSearch}
            onChange={(e) => setEffectSearch(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            {filteredEffects.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleEffect(opt.value)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all text-left ${
                  selectedEffects.includes(opt.value)
                    ? "bg-[#2FF801] border-[#2FF801] text-black"
                    : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]/70 hover:border-[#2FF801]/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flavors */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Geschmack</h3>
          <Input
            placeholder="Filter..."
            value={flavorSearch}
            onChange={(e) => setFlavorSearch(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            {filteredFlavors.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleFlavor(opt.value)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all text-left ${
                  selectedFlavors.includes(opt.value)
                    ? "bg-[#00F5FF] border-[#00F5FF] text-black"
                    : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]/70 hover:border-[#00F5FF]/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* THC + CBD */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">THC</h3>
            <RangeSlider
              min={THC_RANGE.min}
              max={THC_RANGE.max}
              step={0.5}
              value={thcRange}
              onChange={(v) => setThcRange(v)}
              formatLabel={(v) => `${v}%`}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">CBD</h3>
            <RangeSlider
              min={CBD_RANGE.min}
              max={CBD_RANGE.max}
              step={0.5}
              value={cbdRange}
              onChange={(v) => setCbdRange(v)}
              formatLabel={(v) => `${v}%`}
            />
          </div>
        </div>

        {/* Preset-Leiste */}
        {user && (
          <div className="border-t border-[var(--border)] pt-4">
            <button
              onClick={() => setPresetsExpanded(!presetsExpanded)}
              className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-2"
            >
              <span>Gespeicherte Presets</span>
              <span>{presetsExpanded ? "▲" : "▼"}</span>
            </button>

            {presetsExpanded && (
              <div className="space-y-2">
                {presets.length === 0 && (
                  <p className="text-[10px] text-[var(--muted-foreground)] italic">Noch keine Presets</p>
                )}
                {presets.map((preset) => {
                  const applyPreset = () => {
                    setSelectedEffects(preset.effects);
                    setSelectedFlavors(preset.flavors);
                    setThcRange([preset.thc_min, preset.thc_max]);
                    setCbdRange([preset.cbd_min, preset.cbd_max]);
                    const params = new URLSearchParams();
                    if (preset.effects.length > 0) params.set("effects", preset.effects.join(","));
                    if (preset.thc_min !== THC_RANGE.min) params.set("thc_min", preset.thc_min.toString());
                    if (preset.thc_max !== THC_RANGE.max) params.set("thc_max", preset.thc_max.toString());
                    if (preset.cbd_min !== CBD_RANGE.min) params.set("cbd_min", preset.cbd_min.toString());
                    if (preset.cbd_max !== CBD_RANGE.max) params.set("cbd_max", preset.cbd_max.toString());
                    if (preset.flavors.length > 0) params.set("flavors", preset.flavors.join(","));
                    const queryString = params.toString();
                    router.push(`/strains${queryString ? `?${queryString}` : ""}`, { scroll: false });
                  };
                  const deletePreset = async () => {
                    const headers = await getAuthHeaders();
                    const res = await fetch(`/api/filter-presets/${preset.id}`, { method: "DELETE", headers });
                    if (res.ok) setPresets(presets.filter(p => p.id !== preset.id));
                  };
                  return (
                    <div key={preset.id} className="flex items-center gap-1">
                      <button onClick={applyPreset} className="flex-1 text-left px-2 py-1.5 rounded-lg text-xs font-medium bg-[var(--card)] border border-[var(--border)] hover:border-[#2FF801]/50 transition-all truncate">
                        {preset.name}
                      </button>
                      <button onClick={deletePreset} className="p-1 text-white/30 hover:text-red-400 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}

                {savingPreset ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <Input
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value.slice(0, 50))}
                        placeholder="Preset-Name..."
                        className="flex-1 h-8 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newPresetName.trim()) void savePreset();
                          if (e.key === "Escape") { setSavingPreset(false); setNewPresetName(""); }
                        }}
                      />
                      <Button size="sm" onClick={() => void savePreset()} className="h-8 px-2 bg-[#2FF801] text-black font-bold text-xs">Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSavingPreset(false); setNewPresetName(""); }} className="h-8 px-2 text-xs">✕</Button>
                    </div>
                    {presetSaveError && <p className="text-[10px] text-red-400">{presetSaveError}</p>}
                  </div>
                ) : (
                  <SavePresetButton
                    hasActiveFilters={
                      selectedEffects.length > 0 || selectedFlavors.length > 0 ||
                      thcRange[0] !== THC_RANGE.min || thcRange[1] !== THC_RANGE.max ||
                      cbdRange[0] !== CBD_RANGE.min || cbdRange[1] !== CBD_RANGE.max
                    }
                    onClick={() => setSavingPreset(true)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto space-y-2 pt-4 border-t border-[var(--border)]">
          <Button
            onClick={applyFilters}
            className="w-full bg-[#2FF801] text-black font-bold hover:bg-[#2FF801]/90"
          >
            Filter anwenden
          </Button>
          <Button
            onClick={resetFilters}
            variant="ghost"
            className="w-full text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Zurücksetzen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
