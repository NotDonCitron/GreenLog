# Phase 5: Terpene Radar Chart - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning
**Source:** User-provided PRD (Terpene Radar Chart implementation spec)

<domain>
## Phase Boundary

An interactive SVG-based radar/spider chart for terpene profiles, embedded in:
1. **Strain detail page** — back side of the flip card (~line 685–694 in StrainDetailPageClient.tsx)
2. **Strain compare page** — strain-compare-card.tsx at smaller size (size={140})

</domain>

<decisions>
## Implementation Decisions

### TerpeneRadarChart Component
- **Component location:** `src/components/strains/terpene-radar-chart.tsx`
- **Pure SVG** — no Recharts, Chart.js, or any chart library dependency (~80 lines)
- **`use client`** directive required
- Props interface:
  ```typescript
  interface TerpeneRadarChartProps {
    terpenes: (string | Terpene)[];  // Raw data from DB
    themeColor?: string;             // Strain color (Indica/Sativa/Hybrid)
    size?: number;                    // Default: 200
  }
  ```

### Terpene Parsing & Normalization
- **Max 6 terpenes** displayed — slice to 6, sort alphabetically
- **Missing percent values:** All axes set to 70% (visually uniform)
- **Present percent values:** Normalized to 0–100% relative to highest value

### SVG Radar Chart Algorithm
- Angle per axis = 360° / N
- For each axis i:
  - `angle = (i * 2π / N) - π/2` (start at top)
  - `x = centerX + radius * value[i] * cos(angle)`
  - `y = centerY + radius * value[i] * sin(angle)`
- Polygon drawn from all (x,y) points
- **Grid lines:** 3 concentric polygons at 33%, 66%, 100%

### Visual Design
- **Background grid:** Concentric hexagons/polygons in `var(--border)` color
- **Fill:** themeColor at 20% opacity
- **Stroke:** themeColor at 100%
- **Labels:** `text-[9px] uppercase`, `var(--muted-foreground)`
- **Glow effect:** SVG filter on the filled area
- **Animation:** CSS scale transition from 0 → 1 on mount

### Integration — Strain Detail (StrainDetailPageClient.tsx)
- Replace existing terpene chip section (lines ~685–694) with:
  - `≥3 terpenes` → render `<TerpeneRadarChart terpenes={strain.terpenes} themeColor={themeColor} size={180} />`
  - `<3 terpenes` → fallback to existing text chips
  - `0 terpenes` → entire terpene section hidden

### Integration — Strain Compare (strain-compare-card.tsx)
- Same logic as above — render radar chart when `≥3` terpenes
- Size: `size={140}` (smaller than detail page)
- Existing file: `/home/phhttps/Dokumente/Greenlog/GreenLog/src/components/strains/strain-compare-card.tsx`

### Fallback Behavior
| Condition | Behavior |
|-----------|----------|
| ≥ 3 terpenes | Show radar chart |
| 2 terpenes | Text chips (not enough axes for chart) |
| 1 terpene | Text chips |
| 0 terpenes | Entire section hidden |

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Files
- `src/components/strains/StrainDetailPageClient.tsx` — Where radar chart will be integrated (back side flip card)
- `src/components/strains/strain-compare-card.tsx` — Second integration point
- `src/lib/types.ts` — `Terpene` type definition and `Strain` interface

### UI/Brand
- `.claude/get-shit-done/references/ui-brand.md` — Stage banners, checkpoint boxes

### Project Instructions
- `CLAUDE.md` — GreenLog-specific guidelines (no new chart libraries, Pages Router, CSS variables for theming)

</canonical_refs>

<specifics>
## Specific Ideas

### Data Shape (from DB)
The `terpenes` field is `terpenes?: (string | Terpene)[]` where `Terpene = { name: string; percent?: number }`.

**Examples:**
- With percents: `[{ name: "Myrcene", percent: 0.5 }, { name: "Limonene", percent: 0.3 }]`
- Without percents (just names): `["Myrcene", "Limonene", "Caryophyllene"]`

### Theme Color Mapping
Strain types map to colors:
- **Indica:** purple/violet tones
- **Sativa:** green/gold tones
- **Hybrid:** mixed — use dominant color from strain

See existing `themeColor` usage in `StrainDetailPageClient.tsx`.

### SVG Coordinate System
- Center: `(size/2, size/2)`
- Radius: `(size/2 - padding)` for labels
- Padding for labels: ~25px from outer edge

</specifics>

<deferred>
## Deferred Ideas

- **Animated rotation** — radar chart slowly rotates on hover (future enhancement)
- **Interactive tooltips** — show exact percent value on hover per axis (future enhancement)
- **Multiple strain overlay** — compare 2+ strains on same chart (Phase 5 does single strain only)

</deferred>

---

*Phase: 05-terpene-radar-chart*
*Context gathered: 2026-04-11 via PRD Express Path*
