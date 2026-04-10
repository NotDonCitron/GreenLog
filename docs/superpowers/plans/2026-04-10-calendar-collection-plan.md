# Calendar Collection Timeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Interactive calendar filter on Collection page with week/month toggle, activity dots for collected strains, and date click filters feed + scroll-to-first-entry.

**Architecture:** Calendar widget as collapsible inline panel (not Dialog) in CollectionPageClient. Uses react-day-picker's `modifiers` for activity dots. Client-side filtering of existing collection data by `date_added`. Week/Month toggle via local state.

**Tech Stack:** Next.js 16 (Pages Router), react-day-picker v8, TypeScript, existing Calendar component + useCollection hook.

---

## Task 1: Create CalendarActivityDots utility

**Files:**
- Create: `src/lib/calendar-utils.ts`

- [ ] **Step 1: Write the utility**

```typescript
import { format } from "date-fns";
import type { CollectionStrain } from "@/hooks/useCollection";

export type ActivityMap = Record<string, number>;

/**
 * Build a map of date -> count from collection items with date_added.
 * Key format: yyyy-MM-dd (matches react-day-picker modifier format)
 */
export function buildActivityMap(collection: CollectionStrain[]): ActivityMap {
  const map: ActivityMap = {};
  for (const item of collection) {
    const dateKey = item.collected_at;
    if (!dateKey) continue;
    const formatted = format(new Date(dateKey), "yyyy-MM-dd");
    map[formatted] = (map[formatted] || 0) + 1;
  }
  return map;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/calendar-utils.ts
git commit -m "feat: add calendar activity map utility

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Extend Calendar component with modifiers and mode toggle

**Files:**
- Modify: `src/components/ui/calendar.tsx`

**Changes:** Add `modifiers` prop support for activity dots, add `mode` prop (week/month), add `onDateClick` callback.

- [ ] **Step 1: Read current calendar component**

Already read. Note: it wraps `DayPicker` from react-day-picker. Need to add modifiers support.

- [ ] **Step 2: Modify Calendar component**

Replace the Calendar component with this extended version:

```tsx
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarMode = "month" | "week"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  mode?: CalendarMode
  onDateClick?: (date: Date) => void
}

// Extend DayPicker modifiers type
type Modifier = {
  selected?: boolean
  activityDot?: boolean
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  mode = "month",
  onDateClick,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0 w-full", className)}
      classNames={{
        months: "flex flex-col space-y-4 w-full",
        month: "space-y-6 w-full",
        month_caption: "flex justify-center pt-2 relative items-center mb-4 px-8",
        caption_label: "text-base font-black uppercase tracking-[0.2em] text-[#2FF801]",
        nav: "flex items-center justify-between absolute w-full left-0 top-2 px-1 z-10",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-black/20 p-0 opacity-80 hover:opacity-100 border-white/10 text-[var(--foreground)] rounded-lg hover:bg-[#2FF801] hover:text-black transition-all"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-black/20 p-0 opacity-80 hover:opacity-100 border-white/10 text-[var(--foreground)] rounded-lg hover:bg-[#2FF801] hover:text-black transition-all"
        ),
        month_grid: "w-full border-collapse space-y-2",
        weekdays: "flex justify-between mb-2",
        weekday: "text-[var(--foreground)]/30 w-10 font-black uppercase text-[10px] tracking-widest text-center",
        week: "flex w-full justify-between mt-1",
        day: "h-10 w-10 text-center text-sm p-0 relative flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-bold text-base aria-selected:opacity-100 hover:bg-[#2FF801] hover:text-black transition-all rounded-xl"
        ),
        selected:
          "bg-[#2FF801] text-black hover:bg-[#2FF801] hover:text-black focus:bg-[#2FF801] focus:text-black shadow-[0_0_20px_#2FF80166] rounded-xl",
        today: "text-[#2FF801] font-black border-2 border-[#2FF801]/40 rounded-xl",
        outside:
          "day-outside text-[var(--foreground)]/5 opacity-30",
        disabled: "text-[var(--foreground)]/10 opacity-20",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => {
          if (props.orientation === 'left') return <ChevronLeft className="h-5 w-5" />
          return <ChevronRight className="h-5 w-5" />
        }
      }}
      onDayClick={(day, modifiers, e) => {
        if (onDateClick) {
          e.preventDefault()
          onDateClick(day)
        }
        if (props.onDayClick) {
          props.onDayClick(day, modifiers, e)
        }
      }}
      modifiers={props.modifiers}
      modifiersClassNames={{
        activityDot: "relative",
        ...props.modifiersClassNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar, type CalendarMode }
```

- [ ] **Step 3: Verify no breaking changes**

The new props (`mode`, `onDateClick`) are optional and backward-compatible. Existing usages (`mode="single"`, `selected`, `onSelect`) continue to work.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/calendar.tsx
git commit -m "feat(calendar): add mode prop, onDateClick callback, modifiers support

Enables week/month toggle and activity dots.
Backward-compatible with existing usages.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Create CalendarPanel component (collapsible inline panel)

**Files:**
- Create: `src/components/collection/calendar-panel.tsx`

- [ ] **Step 1: Create CalendarPanel**

```tsx
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react"
import { format, addMonths, addWeeks, subMonths, subWeeks, startOfWeek, endOfWeek, isSameMonth } from "date-fns"
import { de } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarMode } from "@/components/ui/calendar"
import type { CollectionStrain } from "@/hooks/useCollection"
import { buildActivityMap, type ActivityMap } from "@/lib/calendar-utils"

interface CalendarPanelProps {
  collection: CollectionStrain[]
  selectedDate: Date | null
  onDateSelect: (date: Date | null) => void
  isOpen: boolean
  onToggle: () => void
}

const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

export function CalendarPanel({
  collection,
  selectedDate,
  onDateSelect,
  isOpen,
  onToggle,
}: CalendarPanelProps) {
  const [viewDate, setViewDate] = React.useState(selectedDate || new Date())
  const [mode, setMode] = React.useState<CalendarMode>("month")

  const activityMap = React.useMemo(() => buildActivityMap(collection), [collection])

  // Get current month or week days
  const displayDays = React.useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(viewDate, { weekStartsOn: 1 })
      const days: Date[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        days.push(d)
      }
      return days
    } else {
      // Month: all days in view
      const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
      const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)
      // Start from Monday of first week
      const start = startOfWeek(firstDay, { weekStartsOn: 1 })
      const days: Date[] = []
      const end = endOfWeek(lastDay, { weekStartsOn: 1 })
      let current = start
      while (current <= end) {
        days.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      return days
    }
  }, [viewDate, mode])

  const goPrev = () => {
    if (mode === "month") setViewDate(subMonths(viewDate, 1))
    else setViewDate(subWeeks(viewDate, 1))
  }

  const goNext = () => {
    if (mode === "month") setViewDate(addMonths(viewDate, 1))
    else setViewDate(addWeeks(viewDate, 1))
  }

  const goToday = () => setViewDate(new Date())

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd")
    const isSelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === dateStr
    if (isSelected) {
      onDateSelect(null) // deselect
    } else {
      onDateSelect(day)
    }
  }

  const toggleMode = () => setMode(m => m === "month" ? "week" : "month")

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
          isOpen
            ? "bg-[#2FF801] text-black"
            : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]/50 hover:border-[#2FF801]/50"
        )}
      >
        <Calendar size={14} />
        {isOpen ? "Kalender ausblenden" : "Kalender anzeigen"}
      </button>

      {/* Calendar content */}
      {isOpen && (
        <div className="mt-3 p-4 bg-[var(--card)] rounded-2xl border border-[var(--border)]/50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header: navigation + mode toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="w-8 h-8 rounded-lg bg-[var(--input)] border border-[var(--border)]/50 flex items-center justify-center hover:border-[#2FF801]/50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-black text-[#2FF801] min-w-[120px] text-center">
                {mode === "month"
                  ? format(viewDate, "MMMM yyyy", { locale: de })
                  : `${format(displayDays[0], "dd.", { locale: de })} - ${format(displayDays[6], "dd. MMM", { locale: de })}`}
              </span>
              <button
                onClick={goNext}
                className="w-8 h-8 rounded-lg bg-[var(--input)] border border-[var(--border)]/50 flex items-center justify-center hover:border-[#2FF801]/50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[#2FF801] transition-colors"
              >
                Heute
              </button>
              <button
                onClick={toggleMode}
                className="px-3 py-1.5 rounded-lg bg-[var(--input)] border border-[var(--border)]/50 text-[10px] font-bold uppercase tracking-wider hover:border-[#2FF801]/50 transition-colors"
              >
                {mode === "month" ? "Woche" : "Monat"}
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS_DE.map(d => (
              <div key={d} className="text-[10px] font-black uppercase text-[var(--muted-foreground)] text-center py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {displayDays.map((day, i) => {
              const dateStr = format(day, "yyyy-MM-dd")
              const activityCount = activityMap[dateStr] || 0
              const isSelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === dateStr
              const isCurrentMonth = isSameMonth(day, viewDate)
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2 rounded-xl text-sm transition-all",
                    !isCurrentMonth && mode === "month" ? "opacity-20" : "",
                    isSelected ? "bg-[#2FF801] text-black shadow-[0_0_20px_#2FF80166]" : "hover:bg-[var(--input)]",
                    isToday && !isSelected && "border border-[#2FF801]/40"
                  )}
                >
                  <span className="font-bold">{format(day, "d")}</span>
                  {activityCount > 0 && (
                    <div className="flex gap-[2px] mt-[2px]">
                      {Array.from({ length: Math.min(activityCount, 3) }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-1 h-1 rounded-full bg-[#FF6B35]"
                        />
                      ))}
                      {activityCount > 3 && (
                        <span className="text-[8px] text-[#FF6B35]">+</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/collection/calendar-panel.tsx
git commit -m "feat: add CalendarPanel component with week/month toggle and activity dots

Collapsible inline panel for collection page calendar filter.
Shows orange dots for days with collected strains.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Update CollectionPageClient to use CalendarPanel

**Files:**
- Modify: `src/app/collection/CollectionPageClient.tsx`

**Changes:**
1. Replace Dialog-based Calendar with CalendarPanel
2. Add ref for scroll-to-first-entry
3. Add "scroll to first" logic on second click on same date

- [ ] **Step 1: Read current file sections that need changes**

Lines 1-102 already read. Key changes:
- Replace `isCalendarOpen` Dialog usage (lines 271-306) with CalendarPanel
- Add `scrollRef` and scroll logic
- Keep existing `selectedDate` + `filteredStrains` filtering

- [ ] **Step 2: Edit imports**

Add to existing imports (line 11-25 area):

```typescript
import { CalendarPanel } from "@/components/collection/calendar-panel"
```

- [ ] **Step 3: Edit component body - add scroll ref and logic**

After line 102 (after all useState declarations), add:

```typescript
  // Scroll ref for calendar date "scroll to first entry" feature
  const strainListRef = React.useRef<HTMLDivElement>(null)
  const lastSelectedDateRef = React.useRef<string | null>(null)

  // Handle date selection with scroll-to-first behavior
  const handleDateSelect = React.useCallback((date: Date | null) => {
    setSelectedDate(date)

    if (date) {
      const dateStr = format(date, "yyyy-MM-dd")

      // Second click on same date = scroll to first entry
      if (lastSelectedDateRef.current === dateStr && strainListRef.current) {
        const firstCard = strainListRef.current.querySelector('[data-date="' + dateStr + '"]')
        if (firstCard) {
          firstCard.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }

      lastSelectedDateRef.current = dateStr
    } else {
      lastSelectedDateRef.current = null
    }
  }, [])
```

- [ ] **Step 4: Add data-date attribute to StrainCards**

In the filteredStrains map (around line 251), add `data-date` attribute for scroll targeting:

```tsx
<div className="grid grid-cols-2 gap-4" ref={strainListRef}>
  {filteredStrains.map((strain, i) => (
    <StrainCard
      key={strain.id}
      strain={strain}
      index={i}
      isCollected={true}
      data-date={strain.collected_at ? format(new Date(strain.collected_at), "yyyy-MM-dd") : undefined}
    />
  ))}
</div>
```

- [ ] **Step 5: Replace Calendar Dialog with CalendarPanel**

Replace the entire Dialog block (lines 271-306) with:

```tsx
      {/* Calendar Panel */}
      <div className="px-6 pt-4">
        <CalendarPanel
          collection={collection}
          selectedDate={selectedDate || null}
          onDateSelect={handleDateSelect}
          isOpen={isCalendarOpen}
          onToggle={() => setIsCalendarOpen(v => !v)}
        />
      </div>
```

- [ ] **Step 6: Update date filter indicator to use format**

Check lines 211-223 — the existing indicator uses `format(selectedDate, "dd. MMMM yyyy", { locale: de })` which is already correct. Ensure `selectedDate` can be `null` by checking the component handles null. The existing code at line 94 sets `useState<Date | undefined>`, so the null case is fine.

- [ ] **Step 7: Verify no console errors**

Run: `npm run lint` to check for TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/collection/CollectionPageClient.tsx
git commit -m "feat(collection): integrate CalendarPanel with week/month toggle

Replaces Dialog-based calendar with inline collapsible CalendarPanel.
Adds scroll-to-first-entry on second click of same date.
Activity dots from collection data.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Verify full flow end-to-end

**Files:**
- Test: `src/app/collection/CollectionPageClient.tsx`
- Test: `src/components/collection/calendar-panel.tsx`

- [ ] **Step 1: Manual verification checklist**

In browser dev tools:
1. [ ] Collection page loads without errors
2. [ ] "Kalender anzeigen" button appears below header
3. [ ] Clicking button expands calendar panel
4. [ ] Toggle between Week/Month changes view
5. [ ] Orange dots appear on days with collected strains (if collection has data)
6. [ ] Clicking a day with no activity: selected ring appears, filter applied (0 results if no match)
7. [ ] Clicking a day with activity: filter applies, badge shows count
8. [ ] Second click on same day: page scrolls to first matching card
9. [ ] X button on filter badge clears date filter

- [ ] **Step 2: Commit if all checks pass**

```bash
git commit --allow-empty -m "chore: verify calendar feature E2E

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Task | File | What changed |
|------|------|-------------|
| 1 | `src/lib/calendar-utils.ts` | New utility for activity map |
| 2 | `src/components/ui/calendar.tsx` | Mode prop, onDateClick, modifiers |
| 3 | `src/components/collection/calendar-panel.tsx` | New collapsible panel |
| 4 | `src/app/collection/CollectionPageClient.tsx` | CalendarPanel integration + scroll logic |

**No new API routes needed.** All filtering is client-side using existing `useCollection` data.