"use client"

import { useCallback, type RefObject } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { FieldRenderer } from "./field-renderer"
import { SkipSection } from "./fields/skip-section"

interface FieldDefinition {
  id: string
  type: string
  label: string
  help?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  required?: boolean
  readOnly?: boolean
  rows?: number
  maxLength?: number
  min?: number
  max?: number
  fields?: FieldDefinition[]
  validation?: Record<string, unknown>
  condition?: Record<string, unknown>
  [key: string]: unknown
}

interface StepDefinition {
  id: string
  title: string
  description?: string
  hint?: string
  optional?: boolean
  skipLabel?: string
  skipConsequences?: string
  fields: FieldDefinition[]
}

interface StepRendererProps {
  step: StepDefinition
  values: Record<string, unknown>
  onChange: (fieldId: string, value: unknown) => void
  errors: Record<string, string>
  disabled?: boolean
  /** Whether this section is currently skipped — managed by parent wizard */
  isSkipped?: boolean
  /** Callback when user toggles skip — managed by parent wizard */
  onToggleSkip?: (stepId: string) => void
  /** Called on field blur for per-field validation */
  onFieldBlur?: (fieldId: string) => void
  /** Ref for the step heading — used for focus management on step transitions */
  headingRef?: RefObject<HTMLHeadingElement | null>
}

export function StepRenderer({
  step,
  values,
  onChange,
  errors,
  disabled,
  isSkipped = false,
  onToggleSkip,
  onFieldBlur,
  headingRef,
}: StepRendererProps) {
  const handleFieldChange = useCallback(
    (fieldId: string) => (value: unknown) => {
      onChange(fieldId, value)
    },
    [onChange]
  )

  return (
    <div className="flex flex-col gap-10">
      {/* Step header — generous bottom spacing to separate from content */}
      <div className="flex flex-col gap-4 pb-2 border-b border-border/50">
        <h2 ref={headingRef} tabIndex={-1} className="font-heading text-[28px] md:text-[32px] font-semibold tracking-tight leading-tight outline-none">
          {step.title}
        </h2>
        {step.description && (
          <p className="text-[15px] md:text-base text-foreground/70 leading-relaxed">
            {step.description}
          </p>
        )}
      </div>

      {/* Hint callout */}
      {step.hint && (
        <Alert variant="info">
          <Info className="text-muted-foreground" />
          <AlertDescription>{step.hint}</AlertDescription>
        </Alert>
      )}

      {/* Skip section toggle for optional steps */}
      {step.optional && onToggleSkip && (
        <SkipSection
          label={step.skipLabel ?? "I don't need this section"}
          consequences={
            step.skipConsequences ??
            "This section will be marked as skipped. You can always come back and fill it in later."
          }
          checked={isSkipped}
          onChange={() => { onToggleSkip(step.id) }}
          disabled={disabled}
          stepId={step.id}
        />
      )}

      {/* Fields — responsive 2-column grid on desktop, single column on mobile */}
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5 transition-opacity duration-200",
          isSkipped && "pointer-events-none opacity-40"
        )}
      >
        {step.fields.map((field) => {
          /* Determine grid column span from layout hint in schema.
             Repeating groups and textareas without explicit "half" layout always span full width. */
          const layout = (field as Record<string, unknown>).layout as string | undefined
          const isFullWidthType = field.type === "repeating" || field.type === "custom" || field.type === "section"
          const spanFull = isFullWidthType || !layout || layout === "full"

          return (
            <div key={field.id} className={cn(spanFull && "md:col-span-2")}>
              <FieldRenderer
                field={field}
                value={values[field.id]}
                onChange={handleFieldChange(field.id)}
                error={errors[field.id]}
                allErrors={errors}
                disabled={disabled || isSkipped}
                allValues={values}
                onBlur={onFieldBlur}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
