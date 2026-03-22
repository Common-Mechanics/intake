"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"

interface HelpTooltipProps {
  text: string
  /** Show inline always instead of behind tooltip */
  alwaysVisible?: boolean
}

export function HelpTooltip({ text, alwaysVisible }: HelpTooltipProps) {
  const [open, setOpen] = useState(false)

  if (alwaysVisible) {
    return (
      <p className="text-[13px] leading-relaxed text-muted-foreground/70 mt-1">{text}</p>
    )
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        aria-label="Show help"
      >
        <HelpCircle className="size-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-72 rounded-md border bg-popover px-3 py-2 text-[13px] leading-relaxed text-popover-foreground shadow-md">
          {text}
        </div>
      )}
    </span>
  )
}
