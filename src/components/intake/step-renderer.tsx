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

      {/* ── CONTENT: fields left, help text right on desktop ── */}
      <div className={cn(
        "flex flex-col md:flex-row gap-6 md:gap-10 transition-opacity duration-200",
        isSkipped && "pointer-events-none opacity-40"
      )}>
        {/* Left column: pure inputs */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-5">
            {step.fields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={{
                  ...field,
                  /* On desktop, strip help from fields — it goes to the sidebar.
                     On mobile, keep help inline (handled by CSS hiding the sidebar). */
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
            ))}
          </div>

          {/* Mobile-only: show help texts below fields since sidebar is hidden */}
          {fieldHelpTexts.length > 0 && (
            <div className="md:hidden mt-6 flex flex-col gap-3">
              {step.fields.map((field) =>
                field.help && field.type !== "section" ? (
                  <div key={`help-${field.id}`} className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                    <p className="text-[13px] leading-relaxed text-muted-foreground/60">{field.help}</p>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>

        {/* Right column: help text sidebar (desktop only) */}
        {fieldHelpTexts.length > 0 && (
          <div className="hidden md:block md:w-[220px] lg:w-[260px] shrink-0">
            <div className="sticky top-32 flex flex-col gap-5">
              {step.fields.map((field) =>
                field.help && field.type !== "section" ? (
                  <p
                    key={`sidebar-${field.id}`}
                    className="text-[12px] leading-relaxed text-muted-foreground/60"
                  >
                    {field.help}
                  </p>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
