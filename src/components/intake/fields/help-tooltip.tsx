"use client"

interface HelpTooltipProps {
  text: string
}

export function HelpTooltip({ text }: HelpTooltipProps) {
  return (
    <p className="text-[13px] leading-relaxed text-muted-foreground/60 mt-0.5">{text}</p>
  )
}
