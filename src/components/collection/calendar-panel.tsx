"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { format, addMonths, addWeeks, subMonths, subWeeks, startOfWeek, endOfWeek, isSameMonth } from "date-fns"
import { de } from "date-fns/locale"
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
      const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
      const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)
      const start = startOfWeek(firstDay, { weekStartsOn: 1 })
      const end = endOfWeek(lastDay, { weekStartsOn: 1 })
      const days: Date[] = []
      let current = new Date(start)
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
  const toggleMode = () => setMode(m => m === "month" ? "week" : "month")

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd")
    const isSelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === dateStr
    if (isSelected) {
      onDateSelect(null)
    } else {
      onDateSelect(day)
    }
  }

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
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={goPrev} className="w-8 h-8 rounded-lg bg-[var(--input)] border border-[var(--border)]/50 flex items-center justify-center hover:border-[#2FF801]/50 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-black text-[#2FF801] min-w-[120px] text-center">
                {mode === "month"
                  ? format(viewDate, "MMMM yyyy", { locale: de })
                  : `${format(displayDays[0], "dd.", { locale: de })} - ${format(displayDays[6], "dd. MMM", { locale: de })}`}
              </span>
              <button onClick={goNext} className="w-8 h-8 rounded-lg bg-[var(--input)] border border-[var(--border)]/50 flex items-center justify-center hover:border-[#2FF801]/50 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goToday} className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[#2FF801] transition-colors">
                Heute
              </button>
              <button onClick={toggleMode} className="px-3 py-1.5 rounded-lg bg-[var(--input)] border border-[var(--border)]/50 text-[10px] font-bold uppercase tracking-wider hover:border-[#2FF801]/50 transition-colors">
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
                        <div key={idx} className="w-1 h-1 rounded-full bg-[#FF6B35]" />
                      ))}
                      {activityCount > 3 && <span className="text-[8px] text-[#FF6B35]">+</span>}
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
