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
  isSkipped?: boolean
  onToggleSkip?: (stepId: string) => void
  onFieldBlur?: (fieldId: string) => void
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

  /* Collect help texts from fields for the right sidebar on desktop */
  const fieldHelpTexts = step.fields
    .filter((f) => f.type !== "section" && f.help)
    .map((f) => ({ id: f.id, label: f.label, help: f.help! }))

  return (
    <div className="flex flex-col gap-8">
      {/* ── TOP SECTION: full width — title, description, hint, skip ── */}
      <div className="flex flex-col gap-4">
        <div className="pb-2 border-b border-border/50">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-[28px] md:text-[32px] font-semibold tracking-tight leading-tight outline-none"
          >
            {step.title}
          </h2>
        </div>

        {step.description && (
          <p className="text-[15px] md:text-base text-foreground/70 leading-relaxed">
            {step.description}
          </p>
        )}

        {step.hint && (
          <Alert variant="info">
            <Info className="text-muted-foreground" />
            <AlertDescription>{step.hint}</AlertDescription>
          </Alert>
        )}

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
      </div>

      {/* ── CONTENT: each field row = input left + help right on desktop ── */}
      <div className={cn(
        "flex flex-col gap-5 transition-opacity duration-200",
        isSkipped && "pointer-events-none opacity-40"
      )}>
        {step.fields.map((field) => {
          const hasHelp = !!field.help && field.type !== "section"

          return (
            <div key={field.id} className="flex flex-col md:flex-row md:gap-8">
              {/* Left: the input field (no help text — stripped on desktop) */}
              <div className="flex-1 min-w-0">
                <FieldRenderer
                  field={{
                    ...field,
                    /* Desktop: help goes to the right column */
                    help: undefined,
                  }}
                  value={values[field.id]}
                  onChange={handleFieldChange(field.id)}
                  error={errors[field.id]}
                  allErrors={errors}
                  disabled={disabled || isSkipped}
                  allValues={values}
                  onBlur={onFieldBlur}
                />
                {/* Mobile: show help below the field */}
                {hasHelp && (
                  <p className="md:hidden mt-1.5 text-[13px] leading-relaxed text-muted-foreground/60">
                    {field.help}
                  </p>
                )}
              </div>

              {/* Right: help text aligned to this field (desktop only) */}
              {hasHelp && (
                <div className="hidden md:flex md:w-[220px] lg:w-[260px] shrink-0 pt-7">
                  <p className="text-[12px] leading-relaxed text-muted-foreground/60">
                    {field.help}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
