"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarMode = "month" | "week"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  mode?: CalendarMode
  onDateClick?: (date: Date) => void
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  mode,
  onDateClick,
  modifiers,
  modifiersClassNames,
  ...props
}: CalendarProps) {
  const handleDayClick = (date: Date, modifiers: { selected?: boolean; disabled?: boolean }) => {
    if (onDateClick && !modifiers.disabled) {
      onDateClick(date)
    }
  }

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
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      onDayClick={handleDayClick}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
