"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Props) {
  return (
    <SwitchPrimitive
      className={cn(
        "group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-[#2FF801] data-unchecked:bg-[#484849] data-checked:opacity-100 data-unchecked:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Switch }
