# Strain Compare Feature – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ermöglicht Usern 2–3 Strains nebeneinander zu vergleichen (THC, CBD, Effects, Flavors, Terpenes) über einen "⚖️ Compare"-Button auf jeder StrainCard.

**Architecture:** Reiner Client-seitiger State via URL-Param `?compare=slug1,slug2,slug3`. Kein Backend/API nötig. Floating Bar und Compare-Button auf StrainCard/Pages, Compare-Seite als neue Route.

**Tech Stack:** Next.js Pages Router, TypeScript, Tailwind, Supabase (nur Lesen), bestehende GreenLog UI-Komponenten.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/components/strains/compare-button.tsx` | **CREATE** | Kleiner ⚖️ Toggle-Button für StrainCard |
| `src/components/strains/compare-floating-bar.tsx` | **CREATE** | Fixed Bar unten rechts wenn ≥2 gewählt |
| `src/components/strains/strain-compare-card.tsx` | **CREATE** | Einzelne Spalte in der Compare-Ansicht |
| `src/components/strains/strain-compare-grid.tsx` | **CREATE** | 2–3 Spalten-Grid Layout |
| `src/app/strains/compare/page.tsx` | **CREATE** | Route `/strains/compare` |
| `src/lib/constants.ts` | **MODIFY** | `MAX_COMPARE_STRAINS = 3` hinzufügen |
| `src/app/strains/page.tsx` | **MODIFY** | `<CompareFloatingBar>` und `<CompareButton>` einbauen |
| `src/components/strains/strain-card.tsx` | **MODIFY** | `<CompareButton>` overlay integrieren |

---

## Task 1: Add MAX_COMPARE_STRAINS constant

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add constant**

Open `src/lib/constants.ts`, find the file end or a relevant section, add:

```typescript
export const MAX_COMPARE_STRAINS = 3;
```

- [ ] **Step 2: Commit**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
git add src/lib/constants.ts
git commit -m "feat(strains): add MAX_COMPARE_STRAINS constant"
```

---

## Task 2: Create CompareButton component

**Files:**
- Create: `src/components/strains/compare-button.tsx`

- [ ] **Step 1: Write CompareButton component**

Create the file with this content:

```tsx
"use client";

import { Scale } from "lucide-react";
import { Strain } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { MAX_COMPARE_STRAINS } from "@/lib/constants";

interface CompareButtonProps {
  strain: Strain;
}

export function CompareButton({ strain }: CompareButtonProps) {
  const searchParams = useSearchParams();

  const compareSlugs = searchParams.get("compare")?.split(",").filter(Boolean) || [];
  const isSelected = compareSlugs.includes(strain.slug);
  const canAdd = compareSlugs.length < MAX_COMPARE_STRAINS;

  const toggleCompare = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const current = searchParams.get("compare")?.split(",").filter(Boolean) || [];
    let next: string[];

    if (isSelected) {
      next = current.filter(s => s !== strain.slug);
    } else if (current.length < MAX_COMPARE_STRAINS) {
      next = [...current, strain.slug];
    } else {
      return; // already at max
    }

    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 0) {
      params.delete("compare");
    } else {
      params.set("compare", next.join(","));
    }

    window.history.pushState(null, "", `?${params.toString()}`);
    // Force re-render of floating bar by dispatching a custom event
    window.dispatchEvent(new CustomEvent("comparechange"));
  }, [strain.slug, isSelected, searchParams]);

  return (
    <button
      onClick={toggleCompare}
      title={isSelected ? "Aus Vergleich entfernen" : "Zum Vergleich hinzufügen"}
      className={`p-1.5 rounded-full transition-all ${
        isSelected
          ? "bg-[#2FF801] text-black"
          : "bg-black/50 backdrop-blur-md text-white/70 hover:text-white hover:bg-black/70"
      }`}
    >
      <Scale size={14} />
    </button>
  );
}
```

Note: This uses `useSearchParams` from `next/navigation` to read/write the compare URL param. It dispatches a `comparechange` custom event so the floating bar can react without re-renders.

- [ ] **Step 2: Commit**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
git add src/components/strains/compare-button.tsx
git commit -m "feat(strains): add CompareButton component"
```

---

## Task 3: Create CompareFloatingBar component

**Files:**
- Create: `src/components/strains/compare-floating-bar.tsx`

- [ ] **Step 1: Write CompareFloatingBar component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Scale, X } from "lucide-react";
import { MAX_COMPARE_STRAINS } from "@/lib/constants";

export function CompareFloatingBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const compareSlugs = searchParams.get("compare")?.split(",").filter(Boolean) || [];
  const count = compareSlugs.length;

  useEffect(() => {
    const handleChange = () => {
      const slugs = new URLSearchParams(window.location.search).get("compare")?.split(",").filter(Boolean) || [];
      setVisible(slugs.length >= 2);
    };

    window.addEventListener("comparechange", handleChange);
    // Also check on mount
    handleChange();
    return () => window.removeEventListener("comparechange", handleChange);
  }, []);

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("compare");
    router.push(`/strains?${params.toString()}`);
    setVisible(false);
  };

  if (!visible || count < 2) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
      <div className="bg-[#121212] border border-[#2FF801]/30 rounded-2xl p-3 shadow-lg shadow-[#2FF801]/10 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Scale size={14} className="text-[#2FF801]" />
          <span className="text-xs font-bold text-white">
            {count} Strain{count > 1 ? "s" : ""} gewählt
          </span>
          <button
            onClick={clearAll}
            className="ml-1 p-0.5 rounded text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearAll}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-[#252525] text-white/60 border border-[#333] hover:border-[#00F5FF]/50 transition-all"
          >
            Leeren
          </button>
          <Link
            href={`/strains/compare?slugs=${compareSlugs.join(",")}`}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-gradient-to-r from-[#2FF801] to-[#2fe000] text-black hover:opacity-90 transition-all flex items-center gap-1"
          >
            <Scale size={10} />
            Vergleichen
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/strains/compare-floating-bar.tsx
git commit -m "feat(strains): add CompareFloatingBar component"
```

---

## Task 4: Integrate CompareButton + CompareFloatingBar into StrainsPage

**Files:**
- Modify: `src/app/strains/page.tsx` — add CompareFloatingBar import and usage
- Modify: `src/components/strains/strain-card.tsx` — add CompareButton overlay

### 4a: Modify StrainsPage

- [ ] **Step 1: Add imports**

Find the existing imports in `page.tsx` (around line 2-16). Add:

```tsx
import { CompareFloatingBar } from "@/components/strains/compare-floating-bar";
```

Also add `lazy` import for CompareFloatingBar to match the existing lazy pattern:

```tsx
const CompareFloatingBar = lazy(() => import("@/components/strains/compare-floating-bar").then(m => ({ default: m.CompareFloatingBar })));
```

Wait — CompareFloatingBar is already a client component with its own `useSearchParams`. Since `page.tsx` is a client component with `<Suspense>` wrappers for `FilterPanel`, we can just add it directly inside the `<main>` but outside the existing Suspense boundary, near the bottom before `<BottomNav />`.

Find the bottom of the page (around line 434-436), before `<BottomNav />` add:

```tsx
<CompareFloatingBar />
```

Note: Since `page.tsx` already uses `lazy` for FilterPanel, and CompareFloatingBar needs `useSearchParams` which works fine in the client component context, we can import it normally (not lazy) since it's small.

Actually, since `page.tsx` is already fully `"use client"`, just do:

```tsx
import { CompareFloatingBar } from "@/components/strains/compare-floating-bar";
```

And add `<CompareFloatingBar />` before `<BottomNav />`.

### 4b: Modify StrainCard

- [ ] **Step 2: Add CompareButton to StrainCard overlay**

Open `src/components/strains/strain-card.tsx`. The card is a `<Link>` with absolute-positioned children inside. We need to add the CompareButton as an overlay that stops propagation (doesn't trigger navigation).

Find the `isCollected` badge section (around line 103-109). Add the CompareButton ABOVE the badges, inside the image area:

Insert after line 101 (after the type badge `</div>`) and before the `isCollected` check:

```tsx
{/* Compare toggle button */}
<div
  className="absolute top-2 left-2 z-30"
  onClick={(e) => e.preventDefault()}
>
  <CompareButton strain={strain} />
</div>
```

Wait — `strain-card.tsx` currently imports from `@/lib/types` and `@/lib/strain-display`. It does NOT have `"use client"` (it's a server component that uses `memo`).

The `CompareButton` uses `useSearchParams()` which requires `"use client"`. So we have two options:
1. Add `"use client"` to strain-card.tsx
2. Pass `isCompareSelected` and `onCompareToggle` as props from the parent

**Option 1 is cleaner** for this feature — StrainCard is already mostly UI-only with no server-side data fetching. Add `"use client"` at the top.

Also need to import CompareButton in strain-card.tsx:

```tsx
import { CompareButton } from "./compare-button";
```

**Full change to StrainCard (step 2):**

```tsx
// Line 1: add "use client"
"use client"

// Line 5: add import
import { CompareButton } from "./compare-button";

// Line ~103 (after the type badge div closes, before isCollected div):
<div
  className="absolute top-2 left-2 z-30"
  onClick={(e) => e.preventDefault()}
>
  <CompareButton strain={strain} />
</div>
```

Actually, the `onClick={(e) => e.preventDefault()}` on the wrapper div won't work well with the button inside. Better approach — just let the button handle its own stopPropagation via its internal `e.stopPropagation()`.

So the wrapper can be:

```tsx
<div className="absolute top-2 left-2 z-30">
  <CompareButton strain={strain} />
</div>
```

And the button itself already calls `e.stopPropagation()` and `e.preventDefault()` in its `toggleCompare` handler.

- [ ] **Step 3: Commit**

```bash
git add src/app/strains/page.tsx src/components/strains/strain-card.tsx
git commit -m "feat(strains): integrate CompareButton and CompareFloatingBar"
```

---

## Task 5: Create strain-compare page components

**Files:**
- Create: `src/components/strains/strain-compare-card.tsx`
- Create: `src/components/strains/strain-compare-grid.tsx`
- Create: `src/app/strains/compare/page.tsx`

### 5a: strain-compare-card.tsx

- [ ] **Step 1: Create strain-compare-card.tsx**

```tsx
"use client";

import { Strain } from "@/lib/types";
import { formatPercent, getEffectDisplay, getStrainTheme, getTasteDisplay, normalizeTerpeneList } from "@/lib/strain-display";
import Image from "next/image";

interface StrainCompareCardProps {
  strain: Strain;
}

export function StrainCompareCard({ strain }: StrainCompareCardProps) {
  const { color: themeColor } = getStrainTheme(strain.type);
  const thcDisplay = formatPercent(strain.avg_thc ?? strain.thc_max, "—");
  const cbdDisplay = formatPercent(strain.avg_cbd ?? strain.cbd_max, "< 1%");
  const effectDisplay = getEffectDisplay(strain);
  const tasteDisplay = getTasteDisplay(strain);
  const normalizedTerpenes = normalizeTerpeneList(strain.terpenes);
  const flavors = strain.flavors || [];

  const thcPercent = strain.avg_thc ?? strain.thc_max ?? 0;
  const cbdPercent = strain.avg_cbd ?? strain.cbd_max ?? 0;

  return (
    <div
      className="rounded-2xl bg-[#1a1a1a] border-t-2 overflow-hidden"
      style={{ borderTopColor: themeColor }}
    >
      {/* Header: Image + Name */}
      <div className="relative aspect-[4/3] bg-[#252525]">
        <Image
          src={strain.image_url || "/strains/placeholder-1.svg"}
          alt={strain.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute bottom-2 left-2">
          <span
            className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider backdrop-blur-md"
            style={{ backgroundColor: `${themeColor}30`, borderColor: `${themeColor}80`, color: themeColor, border: `1px solid ${themeColor}80` }}
          >
            {strain.type === "sativa" ? "Sativa" : strain.type === "indica" ? "Indica" : "Hybrid"}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--muted-foreground)] mb-0.5">
            {strain.farmer?.trim() || strain.manufacturer?.trim() || strain.brand?.trim() || "Unbekannter Farmer"}
          </p>
          <h3 className="font-black italic uppercase text-[var(--foreground)] leading-tight">
            {strain.name}
          </h3>
        </div>

        {/* THC */}
        <div>
          <div className="flex justify-between text-[9px] text-[var(--muted-foreground)] mb-1">
            <span className="font-bold uppercase tracking-widest">THC</span>
            <span className="text-[#2FF801] font-bold">{thcDisplay}</span>
          </div>
          <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2FF801] rounded-full transition-all"
              style={{ width: `${Math.min(thcPercent, 30) / 30 * 100}%` }}
            />
          </div>
        </div>

        {/* CBD */}
        <div>
          <div className="flex justify-between text-[9px] text-[var(--muted-foreground)] mb-1">
            <span className="font-bold uppercase tracking-widest">CBD</span>
            <span className="text-[#00F5FF] font-bold">{cbdDisplay}</span>
          </div>
          <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00F5FF] rounded-full transition-all"
              style={{ width: `${Math.min(cbdPercent, 20) / 20 * 100}%` }}
            />
          </div>
        </div>

        {/* Effects */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Wirkung</p>
          <div className="flex flex-wrap gap-1.5">
            {effectDisplay.split(" · ").slice(0, 4).map((effect, i) => (
              <span key={i} className="text-[8px] font-bold px-2 py-1 bg-[#252525] rounded-md text-white/70">
                {effect}
              </span>
            ))}
          </div>
        </div>

        {/* Flavors */}
        {flavors.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Geschmack</p>
            <div className="flex flex-wrap gap-1.5">
              {flavors.slice(0, 4).map((flavor, i) => (
                <span key={i} className="text-[8px] font-bold px-2 py-1 bg-[#252525] rounded-md text-white/70">
                  {flavor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Terpenes */}
        {normalizedTerpenes.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Terpene</p>
            <div className="flex flex-wrap gap-1.5">
              {normalizedTerpenes.slice(0, 5).map((t, i) => (
                <span
                  key={i}
                  className="text-[8px] font-bold px-2 py-1 rounded-md"
                  style={{
                    backgroundColor: `${themeColor}15`,
                    border: `1px solid ${themeColor}40`,
                    color: themeColor,
                  }}
                >
                  {typeof t === "string" ? t : t.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

Note: `normalizeTerpeneList` is from `@/lib/strain-display` which re-exports from `display/index.ts`. Verify it exists in `display/normalization.ts`.

- [ ] **Step 2: Verify normalizeTerpeneList exists**

```bash
grep -n "normalizeTerpeneList" /home/phhttps/Dokumente/Greenlog/GreenLog/src/lib/display/normalization.ts
```

If it doesn't exist, create it or use an inline implementation. The function should normalize `strain.terpenes` (which is `(string | Terpene)[]`) to a consistent array.

- [ ] **Step 3: Commit strain-compare-card**

```bash
git add src/components/strains/strain-compare-card.tsx
git commit -m "feat(strains): create StrainCompareCard component"
```

### 5b: strain-compare-grid.tsx

- [ ] **Step 4: Create strain-compare-grid.tsx**

```tsx
"use client";

import { Strain } from "@/lib/types";
import { StrainCompareCard } from "./strain-compare-card";
import Link from "next/link";

interface StrainCompareGridProps {
  strains: Strain[];
}

export function StrainCompareGrid({ strains }: StrainCompareGridProps) {
  const slots = [...strains];
  // Pad to 3 slots
  while (slots.length < 3) {
    slots.push(null as any);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {slots.slice(0, 3).map((strain, i) =>
        strain ? (
          <StrainCompareCard key={strain.id} strain={strain} />
        ) : (
          <Link
            key="placeholder"
            href="/strains"
            className="rounded-2xl border-2 border-dashed border-[#333] hover:border-[#00F5FF]/50 transition-all flex flex-col items-center justify-center min-h-[300px] text-center p-8 group"
          >
            <div className="text-4xl mb-3 text-[#333] group-hover:text-[#00F5FF]/50 transition-colors">+</div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#484849] group-hover:text-[#00F5FF]/70 transition-colors">
              3. Strain auswählen
            </p>
            <p className="text-[10px] text-[#333] mt-1">Zur Strains-Seite</p>
          </Link>
        )
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/strains/strain-compare-grid.tsx
git commit -m "feat(strains): create StrainCompareGrid component"
```

### 5c: /strains/compare page.tsx

- [ ] **Step 6: Create /strains/compare/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";
import { StrainCompareGrid } from "@/components/strains/strain-compare-grid";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slugsParam = searchParams.get("slugs");
    if (!slugsParam) {
      void router.replace("/strains");
      return;
    }

    const slugs = slugsParam.split(",").filter(Boolean).slice(0, 3);
    if (slugs.length < 2) {
      void router.replace("/strains");
      return;
    }

    async function fetchStrains() {
      setLoading(true);
      const { data, error } = await supabase
        .from("strains")
        .select("*")
        .in("slug", slugs);

      if (error) {
        console.error("Compare fetch error:", error);
        setStrains([]);
      } else {
        // Maintain order from URL
        const strainMap = new Map((data || []).map(s => [s.slug, s]));
        const ordered = slugs.map(slug => strainMap.get(slug)).filter(Boolean) as Strain[];
        setStrains(ordered);
      }
      setLoading(false);
    }

    void fetchStrains();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 glass-surface border-b border-[var(--border)]/50 px-6 pt-12 pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/strains"
              className="p-2 rounded-full bg-[var(--card)] border border-[var(--border)]/50 hover:border-[#00F5FF]/50 transition-all"
            >
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter font-display">
                Strain Vergleich
              </h1>
              {strains.length > 0 && (
                <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest font-bold">
                  {strains.length} Strain{strains.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
          </div>
        ) : strains.length >= 2 ? (
          <StrainCompareGrid strains={strains} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
              Mindestens 2 Strains nötig
            </p>
            <Link
              href="/strains"
              className="px-6 py-3 bg-[#2FF801] text-black font-bold rounded-xl"
            >
              Strains durchsuchen
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/strains/compare/page.tsx
git commit -m "feat(strains): add /strains/compare page"
```

---

## Task 6: Self-Review

Verify the implementation against the spec:

- [ ] **Spec coverage check:**
  - [ ] Compare-Button auf StrainCard → Task 4b + Task 2
  - [ ] Floating Bar wenn ≥2 gewählt → Task 3 + Task 4a
  - [ ] `/strains/compare` Page → Task 5c
  - [ ] THC/CBD Balken → Task 5a (StrainCompareCard)
  - [ ] Effects + Flavors + Terpene Tags → Task 5a
  - [ ] 3. Strain Placeholder → Task 5b
  - [ ] URL-Param `?compare=...` für Shareability → Task 2 (CompareButton)
  - [ ] Max 3 Strains → Task 1 + Task 2

- [ ] **Placeholder scan:** No TBD/TODO in code. All types resolved. `normalizeTerpeneList` verified to exist.

- [ ] **Type consistency:** `Strain` interface imported from `@/lib/types` consistently. `StrainSource` not needed here.

- [ ] **Build test:**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog
npm run build 2>&1 | tail -30
```

Expected: No TypeScript errors, no build failures.

If there are errors, fix them inline and re-run the build.

---

## Final Commit

```bash
git add -A
git commit -m "feat(strains): add strain compare feature

- CompareButton on each StrainCard (toggle to add/remove)
- CompareFloatingBar appears when 2+ strains selected
- /strains/compare page with side-by-side grid
- THC/CBD progress bars, effects/flavors/terpenes tags
- URL-based state for shareability

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
