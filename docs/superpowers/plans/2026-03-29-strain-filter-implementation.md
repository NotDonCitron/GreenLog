# Strain Filter Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a slide-out filter panel to `/strains` with Effects checkboxes and THC/CBD range sliders. Filter state persisted in URL params.

**Architecture:** Filter panel as a right-side slide-out using Dialog primitive with custom positioning. Range sliders as custom dual-handle components. Filter state managed via URL search params with `useSearchParams`.

**Tech Stack:** React hooks, Tailwind CSS animations, Radix Dialog (existing), custom RangeSlider component

---

## File Map

```
Modified:
- src/app/strains/page.tsx                    # Add filter button, active badges, URL state
- src/lib/types.ts                            # Add filter-related types if needed

Created:
- src/components/strains/filter-panel.tsx      # Slide-out panel with all filter controls
- src/components/strains/range-slider.tsx     # Dual-handle range slider for THC/CBD
- src/components/strains/active-filter-badges.tsx  # Horizontal bar of active filter badges
```

---

## Constants (add to types.ts or create constants file)

**File:** `src/lib/constants.ts` (create new)

```typescript
export const EFFECT_OPTIONS = [
  "Entspannt", "Kreativ", "Glücklich", "Fokussiert", "Euphörisch", "Schläfrig",
  "Energisch", "Gesprächig", "Hungrig", "Kichernd", "Beruhigend", "Prickelnd",
  "Motiviert", "Klar"
] as const;

export const THC_RANGE = { min: 0, max: 35 };
export const CBD_RANGE = { min: 0, max: 25 };

export type Effect = typeof EFFECT_OPTIONS[number];
```

---

## Task 1: RangeSlider Component

**Files:**
- Create: `src/components/strains/range-slider.tsx`

- [ ] **Step 1: Create the RangeSlider component**

```tsx
"use client";

import { useState, useCallback } from "react";

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatLabel?: (value: number) => string;
}

export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatLabel = (v) => v.toString(),
}: RangeSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), localValue[1] - step);
    const newValue: [number, number] = [newMin, localValue[1]];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), localValue[0] + step);
    const newValue: [number, number] = [localValue[0], newMax];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const minPercent = ((localValue[0] - min) / (max - min)) * 100;
  const maxPercent = ((localValue[1] - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
        <span>{formatLabel(localValue[0])}</span>
        <span>{formatLabel(localValue[1])}</span>
      </div>
      <div className="relative h-2">
        {/* Track background */}
        <div className="absolute inset-0 bg-[var(--border)] rounded-full" />
        {/* Active track */}
        <div
          className="absolute h-full bg-[#2FF801] rounded-full"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />
        {/* Min handle */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[0]}
          onChange={handleMinChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        {/* Max handle */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[1]}
          onChange={handleMaxChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
        {/* Visual min thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-[#2FF801] pointer-events-none z-10"
          style={{ left: `calc(${minPercent}% - 8px)` }}
        />
        {/* Visual max thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-[#2FF801] pointer-events-none z-10"
          style={{ left: `calc(${maxPercent}% - 8px)` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Export from a strains index or directly use in FilterPanel**

No additional files needed — the component is self-contained.

- [ ] **Step 3: Commit**

```bash
git add src/components/strains/range-slider.tsx
git commit -m "feat(strains): add dual-handle RangeSlider component

Dual-handle slider for THC/CBD range filtering.
Visual thumbs positioned via CSS calc on track percentage.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: FilterPanel Component

**Files:**
- Create: `src/components/strains/filter-panel.tsx`

- [ ] **Step 1: Create FilterPanel with Dialog adapted as right-side panel**

```tsx
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

  // Initialize from URL params
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

    if (selectedEffects.length > 0) {
      params.set("effects", selectedEffects.join(","));
    }
    if (thcRange[0] !== THC_RANGE.min) {
      params.set("thc_min", thcRange[0].toString());
    }
    if (thcRange[1] !== THC_RANGE.max) {
      params.set("thc_max", thcRange[1].toString());
    }
    if (cbdRange[0] !== CBD_RANGE.min) {
      params.set("cbd_min", cbdRange[0].toString());
    }
    if (cbdRange[1] !== CBD_RANGE.max) {
      params.set("cbd_max", cbdRange[1].toString());
    }

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
        style={{
          animation: "slideInFromRight 0.2s ease-out",
        }}
      >
        <style jsx>{`
          @keyframes slideInFromRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[#2FF801]" />
            <h2 className="text-lg font-bold">Filter</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-sm opacity-70 hover:opacity-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Effects Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            Effects
          </h3>
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

        {/* THC Range */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            THC
          </h3>
          <RangeSlider
            min={THC_RANGE.min}
            max={THC_RANGE.max}
            step={0.5}
            value={thcRange}
            onChange={(v) => setThcRange(v)}
            formatLabel={(v) => `${v}%`}
          />
        </div>

        {/* CBD Range */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            CBD
          </h3>
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/strains/filter-panel.tsx
git commit -m "feat(strains): add FilterPanel slide-out component

Right-side panel with Effects checkboxes, THC/CBD RangeSliders.
Reads/writes filter state to URL params via useSearchParams.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: ActiveFilterBadges Component

**Files:**
- Create: `src/components/strains/active-filter-badges.tsx`

- [ ] **Step 1: Create the ActiveFilterBadges component**

```tsx
"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { THC_RANGE, CBD_RANGE } from "@/lib/constants";

interface ActiveFilterBadgesProps {
  effects: string[];
  thcMin: number;
  thcMax: number;
  cbdMin: number;
  cbdMax: number;
}

export function ActiveFilterBadges({
  effects,
  thcMin,
  thcMax,
  cbdMin,
  cbdMax,
}: ActiveFilterBadgesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasThcFilter = thcMin !== THC_RANGE.min || thcMax !== THC_RANGE.max;
  const hasCbdFilter = cbdMin !== CBD_RANGE.min || cbdMax !== CBD_RANGE.max;
  const hasFilters = effects.length > 0 || hasThcFilter || hasCbdFilter;

  if (!hasFilters) return null;

  const removeFilter = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      const current = params.get(key)?.split(",").filter((v) => v !== value) || [];
      if (current.length > 0) {
        params.set(key, current.join(","));
      } else {
        params.delete(key);
      }
    } else {
      params.delete(key);
    }
    const queryString = params.toString();
    router.push(`/strains${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  const clearAll = () => {
    router.push("/strains", { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 px-1">
      {hasThcFilter && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("thc_min");
            params.delete("thc_max");
            router.push(`/strains?${params.toString()}`, { scroll: false });
          }}
          className="flex items-center gap-1 px-2 py-1 bg-[#00F5FF]/20 border border-[#00F5FF]/30 text-[#00F5FF] text-xs font-medium rounded-full hover:bg-[#00F5FF]/30 transition-colors"
        >
          THC: {thcMin}% — {thcMax}%
          <X size={12} />
        </button>
      )}

      {hasCbdFilter && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("cbd_min");
            params.delete("cbd_max");
            router.push(`/strains?${params.toString()}`, { scroll: false });
          }}
          className="flex items-center gap-1 px-2 py-1 bg-[#00F5FF]/20 border border-[#00F5FF]/30 text-[#00F5FF] text-xs font-medium rounded-full hover:bg-[#00F5FF]/30 transition-colors"
        >
          CBD: {cbdMin}% — {cbdMax}%
          <X size={12} />
        </button>
      )}

      {effects.map((effect) => (
        <button
          key={effect}
          onClick={() => removeFilter("effects", effect)}
          className="flex items-center gap-1 px-2 py-1 bg-[#2FF801]/20 border border-[#2FF801]/30 text-[#2FF801] text-xs font-medium rounded-full hover:bg-[#2FF801]/30 transition-colors"
        >
          {effect}
          <X size={12} />
        </button>
      ))}

      <button
        onClick={clearAll}
        className="px-2 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-2"
      >
        Alle löschen
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/strains/active-filter-badges.tsx
git commit -m "feat(strains): add ActiveFilterBadges component

Shows active filters as dismissible badges above strain grid.
Each badge removes its filter on click. 'Alle löschen' clears all.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Integrate into Strains Page

**Files:**
- Modify: `src/app/strains/page.tsx` (add filter button, URL param reading, filtering logic)
- Create: `src/lib/constants.ts` (EFFECT_OPTIONS, THC_RANGE, CBD_RANGE)

- [ ] **Step 1: Create constants file**

```typescript
export const EFFECT_OPTIONS = [
  "Entspannt", "Kreativ", "Glücklich", "Fokussiert", "Euphörisch", "Schläfrig",
  "Energisch", "Gesprächig", "Hungrig", "Kichernd", "Beruhigend", "Prickelnd",
  "Motiviert", "Klar"
] as const;

export const THC_RANGE = { min: 0, max: 35 };
export const CBD_RANGE = { min: 0, max: 25 };
```

- [ ] **Step 2: Modify strains/page.tsx — add imports and state**

Add to imports:
```tsx
import { FilterPanel } from "@/components/strains/filter-panel";
import { ActiveFilterBadges } from "@/components/strains/active-filter-badges";
import { SlidersHorizontal } from "lucide-react";
import { THC_RANGE, CBD_RANGE } from "@/lib/constants";
```

Add new state after existing useState declarations:
```tsx
const [filterPanelOpen, setFilterPanelOpen] = useState(false);
```

- [ ] **Step 3: Modify strains/page.tsx — read URL params for filters**

Add inside the component body, after useSearchParams is used:
```tsx
const searchParams = useSearchParams();
const [filterEffects, setFilterEffects] = useState<string[]>(
  searchParams.get("effects")?.split(",").filter(Boolean) || []
);
const [filterThcMin, setFilterThcMin] = useState(
  Number(searchParams.get("thc_min") || THC_RANGE.min)
);
const [filterThcMax, setFilterThcMax] = useState(
  Number(searchParams.get("thc_max") || THC_RANGE.max)
);
const [filterCbdMin, setFilterCbdMin] = useState(
  Number(searchParams.get("cbd_min") || CBD_RANGE.min)
);
const [filterCbdMax, setFilterCbdMax] = useState(
  Number(searchParams.get("cbd_max") || CBD_RANGE.max)
);
```

- [ ] **Step 4: Modify filteredStrains logic to include filter checks**

Replace the `filteredStrains` block with:

```tsx
const filteredStrains = strains.filter((s) => {
  const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
  const matchesFilter = matchesSourceFilter(s);

  // Effect filter: strain must have ALL selected effects
  const matchesEffects =
    filterEffects.length === 0 ||
    filterEffects.every((ef) =>
      (s.effects || []).some(
        (se) => se.toLowerCase() === ef.toLowerCase()
      )
    );

  // THC filter: strain.avg_thc or thc_max within range
  const strainThc = s.avg_thc || s.thc_max || 0;
  const matchesThc =
    strainThc >= filterThcMin && strainThc <= filterThcMax;

  // CBD filter
  const strainCbd = s.avg_cbd || s.cbd_max || 0;
  const matchesCbd =
    strainCbd >= filterCbdMin && strainCbd <= filterCbdMax;

  return matchesSearch && matchesFilter && matchesEffects && matchesThc && matchesCbd;
});
```

- [ ] **Step 5: Add FilterButton and ActiveFilterBadges to the header**

After the second Button group (the one with "Alle", "Apotheke", etc.), add:

```tsx
<Button
  size="sm"
  variant="outline"
  onClick={() => setFilterPanelOpen(true)}
  className="bg-[var(--card)] border border-[var(--border)]/50 text-[var(--muted-foreground)] hover:border-[#00F5FF]/50"
>
  <SlidersHorizontal size={14} className="mr-1" />
  Filter
</Button>
```

- [ ] **Step 6: Add ActiveFilterBadges above the strain grid**

After the header section closes (after line with source filter buttons), add:

```tsx
<ActiveFilterBadges
  effects={filterEffects}
  thcMin={filterThcMin}
  thcMax={filterThcMax}
  cbdMin={filterCbdMin}
  cbdMax={filterCbdMax}
/>
```

- [ ] **Step 7: Add FilterPanel at the bottom of JSX**

Add before the closing `</main>` tag:

```tsx
<FilterPanel open={filterPanelOpen} onOpenChange={setFilterPanelOpen} />
```

- [ ] **Step 8: Sync URL params to filter state on change**

Add a useEffect to update local filter state when URL changes:

```tsx
useEffect(() => {
  setFilterEffects(searchParams.get("effects")?.split(",").filter(Boolean) || []);
  setFilterThcMin(Number(searchParams.get("thc_min") || THC_RANGE.min));
  setFilterThcMax(Number(searchParams.get("thc_max") || THC_RANGE.max));
  setFilterCbdMin(Number(searchParams.get("cbd_min") || CBD_RANGE.min));
  setFilterCbdMax(Number(searchParams.get("cbd_max") || CBD_RANGE.max));
}, [searchParams]);
```

- [ ] **Step 9: Commit**

```bash
git add src/app/strains/page.tsx src/lib/constants.ts
git commit -m "feat(strains): integrate filter panel into strains page

Filter button in header opens FilterPanel slide-out.
ActiveFilterBadges bar shows active filters above grid.
Filtering logic applies effects, THC, CBD from URL params.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Verification

1. Navigate to `/strains`
2. Click Filter button — panel should slide in from right
3. Select some Effects, adjust THC/CBD sliders
4. Click "Filter anwenden" — URL should update, grid should filter
5. Active badges should appear above grid
6. Click badge X — filter removed, grid updates
7. Click "Alle löschen" — all filters cleared
8. Refresh page — filters persist from URL
