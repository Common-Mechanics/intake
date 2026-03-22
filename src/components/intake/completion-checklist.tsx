"use client"

import { Check, X, Minus, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StepDef, FieldDef } from "@/lib/intake/schemas"

interface CompletionChecklistProps {
  steps: StepDef[]
  values: Record<string, Record<string, unknown>>
  completedSteps: Set<string>
  skippedSections: Set<string>
  onGoToStep: (index: number) => void
}

/** Check if a field has a meaningful value */
function hasValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value).length > 0
  return true
}

/** Get missing required fields for a step */
function getMissingFields(step: StepDef, stepValues: Record<string, unknown>): FieldDef[] {
  return step.fields.filter((field) => {
    if (!field.validation?.required) return false
    if (field.type === "repeating") {
      const arr = stepValues[field.id]
      if (!Array.isArray(arr) || arr.length === 0) return true
      if (field.validation?.minItems && arr.length < field.validation.minItems) return true
      return false
    }
    return !hasValue(stepValues[field.id])
  })
}

export function CompletionChecklist({
  steps,
  values,
  completedSteps,
  skippedSections,
  onGoToStep,
}: CompletionChecklistProps) {
  const allComplete = steps.every(
    (step) => completedSteps.has(step.id) || skippedSections.has(step.id)
  )

  return (
    <div className="flex flex-col gap-4 mt-6">
      <h3 className="text-lg font-semibold tracking-tight">
        {allComplete ? "Everything looks good" : "Before you finish"}
      </h3>
      <p className="text-sm text-muted-foreground">
        {allComplete
          ? "All sections are complete. You can save and submit."
          : "These sections still need attention:"}
      </p>

      <div className="flex flex-col gap-1">
        {steps.map((step, index) => {
          const isSkipped = skippedSections.has(step.id)
          const isCompleted = completedSteps.has(step.id)
          const stepValues = values[step.id] ?? {}
          const missingFields = isSkipped ? [] : getMissingFields(step, stepValues)
          const hasMissing = missingFields.length > 0
          const isOk = isCompleted || isSkipped

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onGoToStep(index)}
              className={cn(
                "flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-md transition-colors",
                "hover:bg-accent",
                !isOk && "bg-destructive/5"
              )}
            >
              {/* Status icon */}
              <span className="shrink-0 mt-0.5">
                {isSkipped ? (
                  <Minus className="size-4 text-muted-foreground" />
                ) : isCompleted && !hasMissing ? (
                  <Check className="size-4 text-primary" />
                ) : hasMissing ? (
                  <AlertCircle className="size-4 text-destructive" />
                ) : (
                  <X className="size-4 text-muted-foreground" />
                )}
              </span>

              {/* Step info */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={cn(
                  "text-sm font-medium",
                  isSkipped && "text-muted-foreground line-through"
                )}>
                  {step.title}
                </span>

                {isSkipped && (
                  <span className="text-xs text-muted-foreground">Skipped</span>
                )}

                {hasMissing && !isSkipped && (
                  <span className="text-xs text-destructive">
                    Missing: {missingFields.map((f) => f.label).join(", ")}
                  </span>
                )}

                {isCompleted && !hasMissing && !isSkipped && (
                  <span className="text-xs text-muted-foreground">Complete</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
