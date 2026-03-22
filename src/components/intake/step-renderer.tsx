"use client"

import { useState, useCallback } from "react"
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
}

export function StepRenderer({
  step,
  values,
  onChange,
  errors,
  disabled,
}: StepRendererProps) {
  const [skipped, setSkipped] = useState(false)

  const handleFieldChange = useCallback(
    (fieldId: string) => (value: unknown) => {
      onChange(fieldId, value)
    },
    [onChange]
  )

  return (
    <div className="flex flex-col gap-8">
      {/* Step header */}
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl font-medium tracking-tight">
          {step.title}
        </h2>
        {step.description && (
          <p className="text-base text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        )}
      </div>

      {/* Hint callout */}
      {step.hint && (
        <Alert className="bg-muted/50 border-border">
          <Info className="text-muted-foreground" />
          <AlertDescription>{step.hint}</AlertDescription>
        </Alert>
      )}

      {/* Skip section toggle for optional steps */}
      {step.optional && (
        <SkipSection
          label={step.skipLabel ?? "I don't need this section"}
          consequences={
            step.skipConsequences ??
            "This section will be marked as skipped. You can always come back and fill it in later."
          }
          checked={skipped}
          onChange={setSkipped}
          disabled={disabled}
        />
      )}

      {/* Fields */}
      <div
        className={cn(
          "flex flex-col gap-6 transition-opacity duration-200",
          skipped && "pointer-events-none opacity-40"
        )}
      >
        {step.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={handleFieldChange(field.id)}
            error={errors[field.id]}
            disabled={disabled || skipped}
            allValues={values}
          />
        ))}
      </div>
    </div>
  )
}
