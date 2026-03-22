"use client"

import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StepDef } from "@/lib/intake/schemas"

interface ProgressBarProps {
  steps: StepDef[]
  currentStep: number
  completedSteps: Set<string>
  skippedSections: Set<string>
  onStepClick: (index: number) => void
}

export function ProgressBar({
  steps,
  currentStep,
  completedSteps,
  skippedSections,
  onStepClick,
}: ProgressBarProps) {
  const totalSteps = steps.length

  return (
    <>
      {/* Mobile: compact "Step X of Y" with thin progress bar */}
      <div className="md:hidden flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm font-medium truncate ml-3 max-w-[60%] text-right">
            {steps[currentStep].title}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: horizontal dots connected by lines */}
      <div className="hidden md:flex items-start justify-between relative px-4 py-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id)
          const isSkipped = skippedSections.has(step.id)
          const isCurrent = index === currentStep
          const isClickable = isCompleted || isSkipped

          return (
            <div
              key={step.id}
              className="flex flex-col items-center relative z-10 flex-1"
            >
              {/* Connecting line — drawn between dots */}
              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    "absolute top-4 left-1/2 w-full h-0.5",
                    index < currentStep
                      ? "bg-primary"
                      : "bg-border"
                  )}
                  /* Offset by half a dot so it starts at the edge */
                  style={{ transform: "translateX(50%)" }}
                />
              )}

              {/* Dot */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  "relative flex items-center justify-center size-8 rounded-full border-2 text-xs font-medium transition-all duration-300",
                  isCurrent && "border-primary bg-primary text-primary-foreground scale-110",
                  isCompleted && !isCurrent && "border-primary bg-primary text-primary-foreground cursor-pointer hover:scale-105",
                  isSkipped && !isCurrent && "border-muted-foreground/40 bg-muted text-muted-foreground cursor-pointer hover:scale-105",
                  !isCurrent && !isCompleted && !isSkipped && "border-border bg-background text-muted-foreground"
                )}
                aria-label={`${step.title} — step ${index + 1}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="size-4" />
                ) : isSkipped && !isCurrent ? (
                  <Minus className="size-3.5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </button>

              {/* Title below dot */}
              <span
                className={cn(
                  "mt-2 text-[11px] leading-tight text-center max-w-[80px] truncate transition-colors duration-200",
                  isCurrent
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
                title={step.title}
              >
                {step.title}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}
