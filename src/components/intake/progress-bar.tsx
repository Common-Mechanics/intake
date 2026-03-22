"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, ChevronDown, Check, Minus, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { StepDef } from "@/lib/intake/schemas"

interface ProgressBarProps {
  steps: StepDef[]
  currentStep: number
  completedSteps: Set<string>
  skippedSections: Set<string>
  onStepClick: (index: number) => void
  /** Per-step error counts, keyed by step ID */
  stepErrors?: Record<string, number>
}

export function ProgressBar({
  steps,
  currentStep,
  completedSteps,
  skippedSections,
  onStepClick,
  stepErrors = {},
}: ProgressBarProps) {
  const totalSteps = steps.length
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [dropdownOpen])

  const currentStepDef = steps[currentStep]

  function stepIcon(step: StepDef, index: number) {
    const hasErrors = (stepErrors[step.id] ?? 0) > 0
    const isCompleted = completedSteps.has(step.id)
    const isSkipped = skippedSections.has(step.id)

    if (hasErrors) return <AlertCircle className="size-4 text-destructive" />
    if (isSkipped) return <Info className="size-4 text-muted-foreground" />
    if (isCompleted) return <Check className="size-4 text-primary" />
    if (index === currentStep) return <span className="size-2 rounded-full bg-primary" />
    return <span className="size-2 rounded-full bg-border" />
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      {/* Back arrow */}
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => onStepClick(currentStep - 1)}
        disabled={currentStep === 0}
        aria-label="Previous step"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {/* Step indicator + dropdown trigger */}
      <div className="relative flex-1" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 w-full min-h-[36px] px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
        >
          <span className="text-sm font-medium tabular-nums text-muted-foreground shrink-0">
            {currentStep + 1}/{totalSteps}
          </span>
          <span className="text-sm font-medium truncate">
            {currentStepDef.title}
          </span>
          <ChevronDown className={cn(
            "size-3.5 text-muted-foreground shrink-0 transition-transform ml-auto",
            dropdownOpen && "rotate-180"
          )} />
        </button>

        {/* Thin progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 py-1 max-h-[60vh] overflow-y-auto">
            {steps.map((step, index) => {
              const isCurrent = index === currentStep
              const hasErrors = (stepErrors[step.id] ?? 0) > 0

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    onStepClick(index)
                    setDropdownOpen(false)
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left transition-colors",
                    "hover:bg-accent",
                    isCurrent && "bg-accent/50"
                  )}
                >
                  <span className="shrink-0">{stepIcon(step, index)}</span>
                  <span className="tabular-nums text-muted-foreground shrink-0 w-5">
                    {index + 1}.
                  </span>
                  <span className={cn(
                    "truncate",
                    isCurrent && "font-medium",
                    hasErrors && "text-destructive"
                  )}>
                    {step.title}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Forward arrow */}
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => onStepClick(currentStep + 1)}
        disabled={currentStep === totalSteps - 1}
        aria-label="Next step"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
