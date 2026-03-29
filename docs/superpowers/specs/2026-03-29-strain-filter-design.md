# Strain Filter Panel — Design

## Overview

Add a filter panel to the `/strains` page that allows filtering by Effects (14 options), THC range, and CBD range. Filter state is persisted in URL params for shareability.

## Layout

### Filter Button Placement
Filter button appended to the existing tab row on `/strains`:

```
[Alle] [Apotheke] [Eigene] ...  [⚙️ Filter]
```

### Filter Panel (Slide-out from Right)

**Dimensions:** 320px wide, full viewport height, slides in from right edge

**Header:** "Filter" title + close (X) button

**Sections:**

1. **Effects** (14 checkboxes, scrollable if needed)
   - Search/filter input at top: `🔍 Filter...`
   - Options: Entschpannt, Kreativ, Glücklich, Fokussiert, Euphörisch, Schläfrig, Energisch, Gesprächig, Hungrig, Kichernd, Beruhigend, Prickelnd, Motiviert, Klar

2. **THC Range** (dual-handle slider)
   - Min: 0%, Max: 35%
   - Displays current range as text: `THC: 15% — 25%`

3. **CBD Range** (dual-handle slider)
   - Min: 0%, Max: 25%
   - Displays current range as text: `CBD: 0% — 10%`

**Actions:**
- Primary: "Filter anwenden" — applies filters and closes panel
- Secondary: "Zurücksetzen" — clears all filters, does NOT close panel

### Active Filter Badges

When filters are active, display a bar above the strain grid:

```
[THC: 15-25%] ✕  |  [Kreativ] ✕  |  [Fokussiert] ✕  |  [Alle löschen]
```

Each badge shows the filter value and has an X to remove it individually. "Alle löschen" clears all filters at once.

### URL State

All filter state encoded in URL search params:

```
/strains?effects=Kreativ,Fokussiert&thc_min=15&thc_max=25&cbd_min=0&cbd_max=10
```

On page load, read URL params to initialize filter state.

## Component Structure

```
/strains/page.tsx
├── Tab bar (existing)
├── FilterButton (new)
│   └── opens FilterPanel
├── FilterPanel.tsx (new) — slide-out drawer
│   ├── EffectsFilter.tsx
│   ├── RangeSlider.tsx (THC)
│   └── RangeSlider.tsx (CBD)
├── ActiveFilterBadges.tsx (new)
└── StrainGrid (existing)
```

## Data Flow

1. User opens FilterPanel
2. Selects effects / adjusts ranges
3. Clicks "Filter anwenden"
4. URL params updated → triggers strain re-fetch
5. ActiveFilterBadges displayed above grid
6. User can remove individual badges or clear all

## Technical Approach

- Use Next.js `useSearchParams` for URL state
- `useRouter().push` with new params to update URL without page reload
- On URL change, re-fetch strains with filter params via existing API
- FilterPanel uses existing `Dialog` or `Sheet` component pattern
- RangeSlider: two-thumb slider using Radix UI Slider or similar

## Implementation Notes

- Effects stored as `TEXT[]` in Supabase — filter via `&&` (overlap) operator
- THC/CBD stored as `DECIMAL` — filter via `>=` and `<=` comparisons
- Empty filters = no filter applied (show all)
- Filter panel does not auto-apply — explicit "Filter anwenden" button to avoid excessive re-renders
