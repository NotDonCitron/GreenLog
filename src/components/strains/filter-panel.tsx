"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RangeSlider } from "./range-slider";
import { EFFECT_OPTIONS, THC_RANGE, CBD_RANGE } from "@/lib/constants";

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterPanel({ open, onOpenChange }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialEffects = searchParams.get("effects")?.split(",").filter(Boolean) || [];
  const initialThcMin = Number(searchParams.get("thc_min") || THC_RANGE.min);
  const initialThcMax = Number(searchParams.get("thc_max") || THC_RANGE.max);
  const initialCbdMin = Number(searchParams.get("cbd_min") || CBD_RANGE.min);
  const initialCbdMax = Number(searchParams.get("cbd_max") || CBD_RANGE.max);

  const [selectedEffects, setSelectedEffects] = useState<string[]>(initialEffects);
  const [thcRange, setThcRange] = useState<[number, number]>([initialThcMin, initialThcMax]);
  const [cbdRange, setCbdRange] = useState<[number, number]>([initialCbdMin, initialCbdMax]);
  const [effectSearch, setEffectSearch] = useState("");

  const filteredEffects = EFFECT_OPTIONS.filter((e) =>
    e.toLowerCase().includes(effectSearch.toLowerCase())
  );

  const toggleEffect = (effect: string) => {
    setSelectedEffects((prev) =>
      prev.includes(effect) ? prev.filter((e) => e !== effect) : [...prev, effect]
    );
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (selectedEffects.length > 0) params.set("effects", selectedEffects.join(","));
    if (thcRange[0] !== THC_RANGE.min) params.set("thc_min", thcRange[0].toString());
    if (thcRange[1] !== THC_RANGE.max) params.set("thc_max", thcRange[1].toString());
    if (cbdRange[0] !== CBD_RANGE.min) params.set("cbd_min", cbdRange[0].toString());
    if (cbdRange[1] !== CBD_RANGE.max) params.set("cbd_max", cbdRange[1].toString());
    const queryString = params.toString();
    router.push(`/strains${queryString ? `?${queryString}` : ""}`, { scroll: false });
    onOpenChange(false);
  };

  const resetFilters = () => {
    setSelectedEffects([]);
    setThcRange([THC_RANGE.min, THC_RANGE.max]);
    setCbdRange([CBD_RANGE.min, CBD_RANGE.max]);
    setEffectSearch("");
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
            <h2 className="text-lg font-bold">Filter</h2>
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
            {filteredEffects.map((effect) => (
              <button
                key={effect}
                onClick={() => toggleEffect(effect)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all text-left ${
                  selectedEffects.includes(effect)
                    ? "bg-[#2FF801] border-[#2FF801] text-black"
                    : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]/70 hover:border-[#2FF801]/50"
                }`}
              >
                {effect}
              </button>
            ))}
          </div>
        </div>

        {/* THC */}
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

        {/* CBD */}
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