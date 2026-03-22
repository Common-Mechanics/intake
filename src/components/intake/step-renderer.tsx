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

  const hasDescription = !!step.description
  const hasHint = !!step.hint

  return (
    <div className="flex flex-col gap-8">
      {/* Step header — section label + rule (Figma pattern) */}
      <div className="flex flex-col gap-3 pb-2 border-b border-border/50">
        <div className="flex items-center justify-between gap-4">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-[22px] md:text-[26px] font-semibold tracking-tight leading-tight outline-none"
          >
            {step.title}
          </h2>
        </div>

        {/* Skip toggle in header area for optional steps */}
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

      {/* Main content — Figma layout: fields left, description right on desktop */}
      <div className={cn(
        "flex flex-col md:flex-row gap-8 md:gap-12 transition-opacity duration-200",
        isSkipped && "pointer-events-none opacity-40"
      )}>
        {/* Left column: form fields (~62% on desktop) */}
        <div className="flex-1 min-w-0">
          {/* Mobile-only: show description above fields */}
          {hasDescription && (
            <div className="md:hidden mb-6">
              <p className="text-[15px] text-foreground/70 leading-relaxed">
                {step.description}
              </p>
            </div>
          )}

          {/* Mobile-only: show hint above fields */}
          {hasHint && (
            <div className="md:hidden mb-6">
              <Alert variant="info">
                <Info className="text-muted-foreground" />
                <AlertDescription>{step.hint}</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
            {step.fields.map((field) => {
              const layout = (field as Record<string, unknown>).layout as string | undefined
              const isFullWidthType = field.type === "repeating" || field.type === "custom" || field.type === "section" || field.type === "textarea"
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

        {/* Right column: description + hint as sidebar (~35% on desktop) */}
        {(hasDescription || hasHint) && (
          <div className="hidden md:block md:w-[220px] lg:w-[260px] shrink-0">
            <div className="sticky top-32 flex flex-col gap-6">
              {hasDescription && (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              )}
              {hasHint && (
                <div className="rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 px-3 py-2.5">
                  <p className="text-[12px] leading-relaxed text-blue-700 dark:text-blue-300">
                    {step.hint}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
