"use client"

import { TextField } from "./fields/text-field"
import { TextareaField } from "./fields/textarea-field"
import { NumberField } from "./fields/number-field"
import { SelectField } from "./fields/select-field"
import { CheckboxField } from "./fields/checkbox-field"
import { RepeatingGroup } from "./fields/repeating-group"
import { SentimentRulesEditor } from "./sentiment-rules-editor"

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

interface FieldRendererProps {
  field: FieldDefinition
  value: unknown
  onChange: (value: unknown) => void
  error?: string
  disabled?: boolean
  /** All current step values, used to evaluate field.condition */
  allValues?: Record<string, unknown>
  /** Called on blur with the field ID for per-field validation */
  onBlur?: (fieldId: string) => void
  /** Full errors map — passed to repeating groups for sub-field errors */
  allErrors?: Record<string, string>
}

/**
 * Evaluate a simple condition object against current values.
 * Supports { fieldId: expectedValue } — field is visible when all conditions match.
 */
function evaluateCondition(
  condition: Record<string, unknown> | undefined,
  allValues: Record<string, unknown>
): boolean {
  if (!condition) return true

  return Object.entries(condition).every(([key, expected]) => {
    const actual = allValues[key]
    if (typeof expected === "boolean") return actual === expected
    if (typeof expected === "string") return actual === expected
    // Array means "value is one of these"
    if (Array.isArray(expected)) return expected.includes(actual)
    return actual === expected
  })
}

export function FieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled,
  allValues = {},
  onBlur,
  allErrors = {},
}: FieldRendererProps) {
  const handleBlur = () => onBlur?.(field.id)
  // Check conditional visibility
  if (!evaluateCondition(field.condition, allValues)) {
    return null
  }

  const isRequired = (field.validation as Record<string, unknown>)?.required === true

  const commonProps = {
    id: field.id,
    label: field.label,
    help: field.help,
    placeholder: field.placeholder,
    error,
    disabled,
    required: isRequired,
  }

  switch (field.type) {
    case "text":
    case "url":
      return (
        <TextField
          {...commonProps}
          type={field.type as "text" | "url"}
          value={(value as string) ?? ""}
          onChange={onChange as (v: string) => void}
          readOnly={field.readOnly}
          onBlur={handleBlur}
        />
      )

    case "textarea":
    case "longtext":
      return (
        <TextareaField
          {...commonProps}
          value={(value as string) ?? ""}
          onChange={onChange as (v: string) => void}
          readOnly={field.readOnly}
          rows={field.rows}
          maxLength={field.maxLength}
          onBlur={handleBlur}
        />
      )

    case "number":
      return (
        <NumberField
          {...commonProps}
          value={(value as number | "") ?? ""}
          onChange={onChange as (v: number | "") => void}
          readOnly={field.readOnly}
          min={field.min}
          max={field.max}
          onBlur={handleBlur}
        />
      )

    case "select":
      return (
        <SelectField
          {...commonProps}
          value={(value as string) ?? ""}
          onChange={onChange as (v: string) => void}
          options={field.options ?? []}
          onBlur={handleBlur}
          colorMap={field.colorMap as Record<string, number> | undefined}
        />
      )

    case "checkbox":
      return (
        <CheckboxField
          id={field.id}
          label={field.label}
          help={field.help}
          checked={(value as boolean) ?? false}
          onChange={onChange as (v: boolean) => void}
          disabled={disabled}
        />
      )

    case "repeating":
      return (
        <RepeatingGroup
          id={field.id}
          label={field.label}
          help={field.help}
          fields={field.fields ?? []}
          value={(value as Record<string, unknown>[]) ?? []}
          onChange={onChange as (v: Record<string, unknown>[]) => void}
          error={error}
          allErrors={allErrors}
          disabled={disabled}
          validation={field.validation as {
            minItems?: number
            maxItems?: number
            warnAbove?: number
            warnMessage?: string
          }}
          batchInput={field.batchInput as {
            enabled: boolean
            csvColumns?: string[]
            jsonExample?: string
          } | undefined}
          defaultEntries={field.defaultEntries as Record<string, unknown>[] | undefined}
          showColorDots={field.showColorDots as boolean | undefined}
        />
      )

    case "section":
      /* Gestalt law of common region — section dividers create clear
         visual boundaries between field groups within a step */
      return (
        <div className="flex items-center gap-4 pt-4 mt-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground shrink-0">
            {field.label}
          </span>
          <div className="flex-1 h-px bg-border/70" />
        </div>
      )

    case "custom": {
      // Route custom fields to their dedicated components by field ID
      if (field.id === "sentiment_rules_by_category") {
        const customProps = (field as Record<string, unknown>).customProps as {
          categories?: { label: string; value: string; colorIndex: number }[]
        } | undefined
        return (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{field.label}</label>
            {field.help && (
              <p className="text-sm text-muted-foreground">{field.help}</p>
            )}
            <SentimentRulesEditor
              categories={customProps?.categories ?? []}
              value={(value as Record<string, { when_this_happens: string; default_sentiment: string; because: string }[]>) ?? {}}
              onChange={onChange as (v: Record<string, { when_this_happens: string; default_sentiment: string; because: string }[]>) => void}
              disabled={disabled}
            />
          </div>
        )
      }
      // Fallback for unknown custom fields
      return <p className="text-sm text-muted-foreground">Unknown custom field: {field.id}</p>
    }

    default:
      // Fallback: render as text input for unknown types
      return (
        <TextField
          {...commonProps}
          type="text"
          value={(value as string) ?? ""}
          onChange={onChange as (v: string) => void}
        />
      )
  }
}
