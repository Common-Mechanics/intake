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

  /* Group fields into sections based on "section" type separators.
     Each section becomes a visual card with its own header. */
  const sections: { label?: string; fields: FieldDefinition[] }[] = []
  let currentSection: { label?: string; fields: FieldDefinition[] } = { fields: [] }

  for (const field of step.fields) {
    if (field.type === "section") {
      if (currentSection.fields.length > 0 || sections.length === 0) {
        sections.push(currentSection)
      }
      currentSection = { label: field.label, fields: [] }
    } else {
      currentSection.fields.push(field)
    }
  }
  if (currentSection.fields.length > 0) {
    sections.push(currentSection)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── STEP HEADER ── */}
      <div className="flex flex-col gap-4">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl md:text-[28px] font-semibold tracking-tight leading-tight outline-none"
        >
          {step.title}
        </h2>
        {step.description && (
          <p className="text-[15px] text-foreground/60 leading-relaxed max-w-2xl">
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

      {/* ── FIELD SECTIONS ── */}
      <div className={cn(
        "flex flex-col gap-10 transition-opacity duration-200",
        isSkipped && "pointer-events-none opacity-40"
      )}>
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {/* Section header */}
            {section.label && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 shrink-0">
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            )}

            {/* Fields — each field is a row with help text on the right */}
            <div className="flex flex-col gap-6">
              {section.fields.map((field) => {
                const hasHelp = !!field.help
                const isWideType = field.type === "repeating" || field.type === "custom"

                return (
                  <div
                    key={field.id}
                    className={cn(
                      "flex flex-col gap-1.5",
                      /* Desktop: field + help side by side, but only for simple fields */
                      !isWideType && "md:flex-row md:gap-8"
                    )}
                  >
                    {/* The field itself */}
                    <div className={cn(
                      "min-w-0",
                      !isWideType ? "md:flex-[3]" : "w-full"
                    )}>
                      <FieldRenderer
                        field={{ ...field, help: undefined }}
                        value={values[field.id]}
                        onChange={handleFieldChange(field.id)}
                        error={errors[field.id]}
                        allErrors={errors}
                        disabled={disabled || isSkipped}
                        allValues={values}
                        onBlur={onFieldBlur}
                      />
                    </div>

                    {/* Help text — right side on desktop, below on mobile */}
                    {hasHelp && !isWideType && (
                      <p className={cn(
                        "text-[13px] leading-relaxed text-muted-foreground/50",
                        "md:flex-[2] md:pt-7"
                      )}>
                        {field.help}
                      </p>
                    )}

                    {/* Wide types (repeating, custom): help below */}
                    {hasHelp && isWideType && (
                      <p className="text-[13px] leading-relaxed text-muted-foreground/50 md:hidden">
                        {field.help}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
