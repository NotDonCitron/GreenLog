# Filter Presets – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Private benannte Filter-Presets für die Strains-Suche (Effects + Flavors + THC + CBD), gespeichert in der DB.

**Architecture:** URL-Param-basiert für Filter-State. Filter-Panel holt/macht Presets via API. Kein Preset-Button im Demo Mode.

**Tech Stack:** Next.js Pages Router, Supabase (RLS), bestehende FilterPanel-Component.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_filter_presets.sql` | CREATE | Neue Tabelle + RLS |
| `src/app/api/filter-presets/route.ts` | CREATE | GET + POST Handler |
| `src/app/api/filter-presets/[id]/route.ts` | CREATE | DELETE Handler |
| `src/components/strains/filter-panel.tsx` | MODIFY | Flavor-Sektion + Preset-Leiste |
| `src/app/strains/page.tsx` | MODIFY | Flavor-URL-Params lesen |
| `src/lib/constants.ts` | MODIFY | `FLAVOR_OPTIONS` mit Fixed-Liste |

Note: `flavors` in `strains` Tabelle ist bereits TEXT[] – keine Schema-Änderung nötig.

---

## Task 1: DB Migration – filter_presets Tabelle

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_filter_presets.sql`

- [ ] **Step 1: Create migration file**

Create a file `supabase/migrations/20260402_filter_presets.sql`:

```sql
-- Filter Presets Tabelle
CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 50),
  effects TEXT[] DEFAULT '{}',
  flavors TEXT[] DEFAULT '{}',
  thc_min NUMERIC(4,1) DEFAULT 0,
  thc_max NUMERIC(4,1) DEFAULT 100,
  cbd_min NUMERIC(4,1) DEFAULT 0,
  cbd_max NUMERIC(4,1) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;

-- Owner kann lesen, schreiben, löschen
CREATE POLICY "Owner can manage own presets"
  ON filter_presets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Note: `profiles` Reference assumes `profiles.id = auth.users.id`. Verify this matches your existing schema. If profiles table doesn't exist or uses a different FK, adjust the REFERENCES clause.

- [ ] **Step 2: Push migration**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && supabase db push 2>&1 | tail -10
```

Expected: Success message or table created confirmation.

If migration fails due to auth.users reference, fix the FK to match your actual schema (profiles.id or direct auth.users.id).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260402_filter_presets.sql
git commit -m "feat(filter-presets): add filter_presets table with RLS"
```

---

## Task 2: GET + POST API Route

**Files:**
- Create: `src/app/api/filter-presets/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/filter-presets/route.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { data, error } = await supabase
    .from("filter_presets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError("Failed to fetch presets", 500);
  }

  return jsonSuccess(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const { name, effects, flavors, thc_min, thc_max, cbd_min, cbd_max } = body as {
    name?: string;
    effects?: string[];
    flavors?: string[];
    thc_min?: number;
    thc_max?: number;
    cbd_min?: number;
    cbd_max?: number;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return jsonError("Name is required", 400);
  }

  const trimmedName = name.trim().slice(0, 50);

  const { data, error } = await supabase
    .from("filter_presets")
    .insert({
      user_id: user.id,
      name: trimmedName,
      effects: effects || [],
      flavors: flavors || [],
      thc_min: thc_min ?? 0,
      thc_max: thc_max ?? 100,
      cbd_min: cbd_min ?? 0,
      cbd_max: cbd_max ?? 100,
    })
    .select()
    .single();

  if (error) {
    return jsonError("Failed to create preset", 500);
  }

  return jsonSuccess(data, 201);
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit src/app/api/filter-presets/route.ts 2>&1 | head -20
```

Expected: No errors (or only pre-existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/filter-presets/route.ts
git commit -m "feat(filter-presets): add GET + POST API routes"
```

---

## Task 3: DELETE API Route

**Files:**
- Create: `src/app/api/filter-presets/[id]/route.ts`

- [ ] **Step 1: Create DELETE route**

Create `src/app/api/filter-presets/[id]/route.ts`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { jsonSuccess, jsonError } from "@/lib/api-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { id } = await params;

  // Verify ownership before delete
  const { data: preset, error: fetchError } = await supabase
    .from("filter_presets")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchError || !preset) {
    return jsonError("Preset not found", 404);
  }

  if (preset.user_id !== user.id) {
    return jsonError("Forbidden", 403);
  }

  const { error: deleteError } = await supabase
    .from("filter_presets")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return jsonError("Failed to delete preset", 500);
  }

  return jsonSuccess({ deleted: true });
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit src/app/api/filter-presets/[id]/route.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/filter-presets/[id]/route.ts
git commit -m "feat(filter-presets): add DELETE API route"
```

---

## Task 4: Flavor-Sektion ins FilterPanel + FLAVOR_OPTIONS

**Files:**
- Modify: `src/lib/constants.ts` – add FLAVOR_OPTIONS
- Modify: `src/components/strains/filter-panel.tsx` – add Flavor-Sektion + Preset-Leiste

### 4a: Add FLAVOR_OPTIONS to constants

- [ ] **Step 1: Read existing constants**

```bash
cat /home/phhttps/Dokumente/Greenlog/GreenLog/src/lib/constants.ts
```

Add `FLAVOR_OPTIONS` after `EFFECT_OPTIONS`. Use a fixed list of common cannabis flavors in German:

```typescript
export const FLAVOR_OPTIONS = [
  { label: "Süß", value: "Sweet" },
  { label: "Sauer", value: "Sour" },
  { label: "Zitrus", value: "Citrus" },
  { label: "Tropisch", value: "Tropical" },
  { label: "Beerig", value: "Berry" },
  { label: "Käse", value: "Cheese" },
  { label: "Erdig", value: "Earthy" },
  { label: "Kräuter", value: "Herbal" },
  { label: "Pine", value: "Pine" },
  { label: "Scharf", value: "Spicy" },
  { label: "Nussig", value: "Nutty" },
  { label: "Moosig", value: "Musky" },
  { label: "Blumig", value: "Floral" },
  { label: "Zitronig", value: "Lemon" },
  { label: "Orangig", value: "Orange" },
  { label: "Minzig", value: "Minty" },
];
```

Add as constant in `constants.ts`.

### 4b: Add Flavor-Sektion ins FilterPanel

- [ ] **Step 2: Read current FilterPanel structure**

```bash
wc -l /home/phhttps/Dokumente/Greenlog/GreenLog/src/components/strains/filter-panel.tsx
```

Read the full file to understand where to insert the Flavor section (after CBD section, before Actions).

- [ ] **Step 3: Add Flavor-Sektion**

Insert after the CBD section (after line ~136, before the Actions div):

```tsx
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
```

Also add to the component:
- State: `const [selectedFlavors, setSelectedFlavors] = useState<string[]>(initialFlavors);` after line ~30
- State: `const [flavorSearch, setFlavorSearch] = useState("");` after line ~31
- Filtered: `const filteredFlavors = FLAVOR_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(flavorSearch.toLowerCase()));`
- Toggle: add `toggleFlavor` similar to `toggleEffect`

### 4c: Add URL param reading for flavors

- [ ] **Step 4: Add initialFlavors from URL**

After `initialCbdMax` declaration (around line 26), add:
```typescript
const initialFlavors = searchParams.get("flavors")?.split(",").filter(Boolean) || [];
```

- [ ] **Step 5: Update applyFilters**

In `applyFilters()` (around line 44), add:
```typescript
if (selectedFlavors.length > 0) params.set("flavors", selectedFlavors.join(","));
```

- [ ] **Step 6: Update resetFilters**

In `resetFilters()` (around line 56), add:
```typescript
setSelectedFlavors([]);
setFlavorSearch("");
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/constants.ts src/components/strains/filter-panel.tsx
git commit -m "feat(filter-panel): add flavor filter section"
```

---

## Task 5: Preset-Leiste ins FilterPanel

**Files:**
- Modify: `src/components/strains/filter-panel.tsx`

### 5a: Add Preset-Leiste State + Fetch

Add inside `FilterPanel` component, after `useState` declarations:
```tsx
const [presets, setPresets] = useState<Array<{
  id: string; name: string; effects: string[]; flavors: string[];
  thc_min: number; thc_max: number; cbd_min: number; cbd_max: number;
}>>([]);
const [presetsExpanded, setPresetsExpanded] = useState(false);
const [savingPreset, setSavingPreset] = useState(false);
const [newPresetName, setNewPresetName] = useState("");

useEffect(() => {
  if (!open) return;
  async function loadPresets() {
    const res = await fetch("/api/filter-presets");
    if (res.ok) {
      const json = await res.json();
      setPresets(json.data || []);
    }
  }
  void loadPresets();
}, [open]);
```

### 5b: Add Preset-Leiste UI

Insert before the Actions div (before line ~140 `mt-auto space-y-2`):

```tsx
{/* Preset-Leiste */}
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
      {presets.map((preset) => (
        <div key={preset.id} className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedEffects(preset.effects);
              setSelectedFlavors(preset.flavors);
              setThcRange([preset.thc_min, preset.thc_max]);
              setCbdRange([preset.cbd_min, preset.cbd_max]);
              void applyFilters();
            }}
            className="flex-1 text-left px-2 py-1.5 rounded-lg text-xs font-medium bg-[var(--card)] border border-[var(--border)] hover:border-[#2FF801]/50 transition-all truncate"
          >
            {preset.name}
          </button>
          <button
            onClick={async () => {
              const res = await fetch(`/api/filter-presets/${preset.id}`, { method: "DELETE" });
              if (res.ok) {
                setPresets(presets.filter(p => p.id !== preset.id));
              }
            }}
            className="p-1 text-white/30 hover:text-red-400 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {/* + Aktuelles speichern */}
      {!savingPreset ? (
        <button
          onClick={() => {
            const hasFilters = selectedEffects.length > 0 || selectedFlavors.length > 0 ||
              thcRange[0] !== THC_RANGE.min || thcRange[1] !== THC_RANGE.max ||
              cbdRange[0] !== CBD_RANGE.min || cbdRange[1] !== CBD_RANGE.max;
            if (hasFilters) setSavingPreset(true);
          }}
          disabled={
            selectedEffects.length === 0 && selectedFlavors.length === 0 &&
            thcRange[0] === THC_RANGE.min && thcRange[1] === THC_RANGE.max &&
            cbdRange[0] === CBD_RANGE.min && cbdRange[1] === CBD_RANGE.max
          }
          className="w-full py-1.5 px-2 rounded-lg text-[10px] font-bold border border-dashed border-[#333] text-[#484849] hover:border-[#2FF801]/50 hover:text-[#2FF801] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          + Aktuelles speichern
        </button>
      ) : (
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
          <Button
            size="sm"
            onClick={async () => {
              if (!newPresetName.trim()) return;
              const res = await fetch("/api/filter-presets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
              }
              setSavingPreset(false);
              setNewPresetName("");
            }}
            className="h-8 px-2 bg-[#2FF801] text-black font-bold text-xs"
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setSavingPreset(false); setNewPresetName(""); }}
            className="h-8 px-2 text-xs"
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  )}
</div>
```

Note: This uses `applyFilters()` which updates URL + closes panel. If you want the panel to stay open after applying a preset, extract the URL-update logic separately.

### 5c: Import FLAVOR_OPTIONS + Button

Add to imports in filter-panel.tsx:
```tsx
import { FLAVOR_OPTIONS, THC_RANGE, CBD_RANGE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
```

### 5d: Demo Mode – hide presets

Wrap the entire Preset-Leiste in:
```tsx
{user && (  // or wherever you check for authenticated user
  <div>... preset section ...</div>
)}
```

If there's no existing user check pattern in FilterPanel, check `useAuth()` and only show presets for logged-in users.

- [ ] **Step 8: Commit**

```bash
git add src/components/strains/filter-panel.tsx
git commit -m "feat(filter-presets): add preset bar to filter panel"
```

---

## Task 6: Flavor-URL-Params in StrainsPage

**Files:**
- Modify: `src/app/strains/page.tsx`

- [ ] **Step 1: Read FilterParamReader**

Find `FilterParamReader` component (around line 42-60 in page.tsx). It reads filter params from URL.

- [ ] **Step 2: Add flavors to FilterParamReader**

After line ~54 (`const cbdMax = ...`), add:
```typescript
const flavors = searchParams.get("flavors")?.split(",").filter(Boolean) || [];
```

And update the `onFiltersReady` call to include flavors:
```typescript
onFiltersReady(effects, thcMin, thcMax, cbdMin, cbdMax, flavors);
```

- [ ] **Step 3: Update handleFiltersReady signature**

Find `handleFiltersReady` (around line 81) and add `flavors` parameter:
```typescript
const handleFiltersReady = useCallback((effects: string[], thcMin: number, thcMax: number, cbdMin: number, cbdMax: number, flavors: string[]) => {
  setFilterEffects(effects);
  setFilterThcMin(thcMin);
  setFilterThcMax(thcMax);
  setFilterCbdMin(cbdMin);
  setFilterCbdMax(cbdMax);
  setFilterFlavors(flavors);
}, []);
```

Add `setFilterFlavors` state and `filterFlavors` state after `filterCbdMax` declaration:
```typescript
const [filterCbdMax, setFilterCbdMax] = useState(CBD_RANGE.max);
const [filterFlavors, setFilterFlavors] = useState<string[]>([]);
```

- [ ] **Step 4: Add filterFlavors to filteredStrains**

Find `filteredStrains` filtering logic (around line 234). Add:
```typescript
const matchesFlavors =
  filterFlavors.length === 0 ||
  filterFlavors.every((ff) =>
    (s.flavors || []).some(
      (sf) => sf.toLowerCase() === ff.toLowerCase()
    )
  );

return matchesSearch && matchesFilter && matchesEffects && matchesThc && matchesCbd && matchesFlavors;
```

- [ ] **Step 5: Update ActiveFilterBadges**

Find `ActiveFilterBadges` usage (around line 443) and add `flavors` prop:
```tsx
<ActiveFilterBadges
  effects={filterEffects}
  thcMin={filterThcMin}
  thcMax={filterThcMax}
  cbdMin={filterCbdMin}
  cbdMax={filterCbdMax}
  flavors={filterFlavors}
/>
```

Check if `ActiveFilterBadges` already accepts `flavors` prop. If not, this is a BREAKING change – either extend `ActiveFilterBadges` to support it, or skip this step and let active filters not show flavor badges (degraded but functional).

- [ ] **Step 6: TypeScript check**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit 2>&1 | head -30
```

Fix any errors inline.

- [ ] **Step 7: Commit**

```bash
git add src/app/strains/page.tsx
git commit -m "feat(filter-presets): add flavor URL params to strains page"
```

---

## Task 7: Self-Review + Build

- [ ] **Step 1: Full TypeScript build**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run build 2>&1 | tail -30
```

Expected: No TypeScript errors, successful build.

- [ ] **Step 2: Spec coverage check**

- [ ] `filter_presets` table with RLS → Task 1
- [ ] GET API → Task 2
- [ ] POST API → Task 2
- [ ] DELETE API → Task 3
- [ ] `FLAVOR_OPTIONS` constant → Task 4a
- [ ] Flavor-Sektion in FilterPanel → Task 4b
- [ ] Flavor URL params → Task 6
- [ ] Preset-Leiste (list, save, delete, apply) → Task 5
- [ ] Demo Mode hidden → Task 5d

- [ ] **Step 3: Fix any issues**

If build fails or TypeScript errors, fix inline.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(filter-presets): complete filter presets feature

- Private named filter presets (effects, flavors, thc, cbd)
- Save/load/delete presets from filter panel
- Collapsible preset bar with instant apply
- Flavor filter section added
- URL-based flavor filtering
- RLS-protected preset storage

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
