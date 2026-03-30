# Strain Card Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the strain card to eliminate text clipping (line-clamp, truncate) and remove redundant badges.

**Architecture:** Single-file change in `src/components/strains/strain-card.tsx`. The card is restructured into 3 zones: (1) header with farmer + name, (2) image with 2 badges only, (3) stats bar with full-text cells.

**Tech Stack:** React (memo), Next.js Image, Tailwind CSS 4, TypeScript

---

## File Map

- `src/components/strains/strain-card.tsx` — **ONLY file to modify**

---

## Task 1: Rewrite the StrainCard — Header + Image + Stats

**File:**
- Modify: `src/components/strains/strain-card.tsx`

Read the current file first. Then replace the entire card JSX with the new structure below.

- [ ] **Step 1: Read current file**

```bash
cat src/components/strains/strain-card.tsx
```

- [ ] **Step 2: Replace card body — Header + Image + Stats**

Replace the entire `return (` block inside `StrainCard`. Keep all imports, all logic above the `return`. Only change the JSX.

**Old structure to replace** (lines ~39–102 in current file):
```tsx
<Link
  href={...}
  className={`premium-card ${themeClass} ...`}
  style={{ borderColor: themeColor, ... }}
>
  {/* OLD: shrink-0 p-3 pb-1 — farmer + name with line-clamp-2 */}
  {/* OLD: relative flex-1 min-h-0 px-2 py-1 — image with 4 badges */}
  {/* OLD: shrink-0 px-3 — stats bar with truncate */}
</Link>
```

**New structure:**
```tsx
<Link
  href={`/strains/${strain.slug}`}
  className={`premium-card ${themeClass} group relative flex w-full min-w-0 flex-col rounded-[20px] border-2 bg-[#121212] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden aspect-[4/5]`}
  style={{
    borderColor: themeColor,
    animationDelay: `${index * 0.05}s`,
    animationFillMode: 'both'
  }}
>
  {/* 1. HEADER: Farmer + Strain Name */}
  <div className="shrink-0 p-3 pb-1 min-w-0 relative z-10">
    <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-[var(--foreground)]/30">
      {farmerDisplay}
    </p>
    <p className="title-font italic text-[13px] font-black leading-tight uppercase text-[var(--foreground)] break-words">
      {normalizedStrainName}
    </p>
  </div>

  {/* 2. IMAGE with 2 badges only */}
  <div className="relative flex-1 min-h-0 px-2 py-1 z-10">
    <div className="absolute inset-0 rounded-xl border border-white/5 shadow-lg overflow-hidden">
      <Image
        src={strain.image_url || "/strains/placeholder-1.svg"}
        alt={strain.name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        sizes="(max-width: 768px) 50vw, 33vw"
        loading="lazy"
      />
      {/* Type Badge — top left */}
      <div
        className="absolute top-2 left-2 px-2 py-1 rounded-full backdrop-blur-md border text-[8px] font-bold uppercase tracking-widest"
        style={{
          backgroundColor: `${themeColor}20`,
          borderColor: `${themeColor}80`,
          color: themeColor,
        }}
      >
        {strain.type || 'HYBRID'}
      </div>
      {/* In Sammlung Badge — top right */}
      {isCollected && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md border border-[#00F5FF]/30"
          style={{ backgroundColor: '#00F5FF20' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#00F5FF]" />
          <span className="text-[8px] font-bold uppercase tracking-wider text-[#00F5FF]">In Sammlung</span>
        </div>
      )}
    </div>
  </div>

  {/* 3. STATS BAR — no truncate, no duplicate In Sammlung */}
  <div className="shrink-0 px-3 w-full relative z-10">
    <div className="rounded-xl border border-white/10 bg-[#121212]/80 p-2 shadow-inner backdrop-blur-sm">
      <div className="grid grid-cols-4 gap-1">
        {/* THC */}
        <div className="flex flex-col items-center gap-0">
          <span className="text-[6px] font-bold uppercase tracking-widest text-[var(--foreground)]/30">THC</span>
          <span className="text-[9px] font-black tracking-wide" style={{ color: themeColor }}>{thcDisplay}</span>
        </div>
        {/* CBD */}
        <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1">
          <span className="text-[6px] font-bold uppercase tracking-widest text-[var(--foreground)]/30">CBD</span>
          <span className="text-[9px] font-black tracking-wide" style={{ color: themeColor }}>{cbdDisplay}</span>
        </div>
        {/* Taste — no truncate */}
        <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1">
          <span className="text-[6px] font-bold uppercase tracking-widest text-[var(--foreground)]/30">TASTE</span>
          <span className="text-[8px] font-medium tracking-wide text-[var(--foreground)]/70">{tasteDisplay}</span>
        </div>
        {/* Effect — no truncate */}
        <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1">
          <span className="text-[6px] font-bold uppercase tracking-widest text-[var(--foreground)]/30">EFF</span>
          <span className="text-[8px] font-medium tracking-wide text-[var(--foreground)]/70">{effectDisplay}</span>
        </div>
      </div>
    </div>
  </div>
</Link>
```

- [ ] **Step 3: Run dev server and verify**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run dev
```

Open http://localhost:3000/collection — check:
- Strain names wrap to multiple lines without clipping
- Taste and Effect show full text ("Zitrus, Erdig", "Energy, Fokus")
- No THC badge on image
- No Terpene badges on image
- "In Sammlung" only appears top-right on image

- [ ] **Step 4: Test with Playwright**

```bash
cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx playwright test tests/app.spec.ts --grep "Strains|Collection" 2>&1 | head -40
```

Expected: tests pass, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/strains/strain-card.tsx
git commit -m "feat: redesign strain card — remove text clipping, simplify badges

- Remove line-clamp-2 and truncate from name/taste/effect
- Remove THC and terpene badges from image
- Keep Type badge (top-left) and In Sammlung badge (top-right)
- Stats bar now shows full taste/effect text
- Border style on stats bar bg changed to bg-[#121212]/80

Design: Option D — Minimal Badge Style (2026-03-30)"
```

---

## Verification Checklist

After implementing, verify each of these manually:

1. **Langer Strain-Name**: Find a card with "Girl Scout Cookies" or similar — name wraps, not clipped
2. **Terpene voll**: Taste-Spalte zeigt "Zitrus, Erdig" (nicht nur "Zitrus")
3. **Kein doppeltes Badge**: "In Sammlung" nur oben rechts auf dem Bild, nicht in Stats-Leiste
4. **Type-Farben**: Sativa=Grün, Indica=Orange, Hybrid=Lila
5. **Hover funktioniert**: Card skaliert, Bild zoomt leicht
6. **collection/ und strains/ beide**: Card sieht überall gleich aus
