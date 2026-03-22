import { z } from "zod"
import type { FieldDef } from "./schemas"

/**
 * Converts JSON field definitions into a Zod schema for runtime validation.
 * This bridges the gap between the declarative JSON form schema and
 * Zod's programmatic validation — so we don't maintain two sets of rules.
 */

function buildFieldValidator(field: FieldDef, isRequired: boolean): z.ZodTypeAny {
  const v = field.validation

  switch (field.type) {
    case "text":
    case "textarea": {
      let schema = z.string({ error: "This field is required" })
      if (isRequired) schema = schema.min(v?.minLength ?? 1, "This field is required")
      else if (v?.minLength) schema = schema.min(v.minLength)
      if (v?.maxLength) schema = schema.max(v.maxLength)
      if (v?.pattern) schema = schema.regex(new RegExp(v.pattern))
      return schema
    }

    case "url": {
      const urlPattern = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i
      let schema = z.string({ error: "This field is required" })
      if (isRequired) schema = schema.min(1, "This field is required")
      if (v?.minLength) schema = schema.min(v.minLength)
      if (v?.maxLength) schema = schema.max(v.maxLength)
      return schema.refine(
        (val) => !val || urlPattern.test(val.trim()),
        { message: "Please enter a valid URL (e.g. www.example.com)" }
      )
    }

    case "number": {
      let schema = z.number({ error: "Please enter a number" })
      if (v?.min !== undefined) schema = schema.min(v.min)
      if (v?.max !== undefined) schema = schema.max(v.max)
      return schema
    }

    case "checkbox": {
      return z.boolean()
    }

    case "select": {
      if (field.options && field.options.length > 0) {
        const values = field.options.map((o) => o.value) as [
          string,
          ...string[],
        ]
        let schema = z.enum(values, { message: "Please select an option" })
        if (isRequired) schema = schema
        return schema
      }
      let schema = z.string({ error: "Please select an option" })
      if (isRequired) schema = schema.min(1, "Please select an option")
      return schema
    }

    case "repeating": {
      const subFields = field.fields ?? []
      const shape: Record<string, z.ZodTypeAny> = {}
      for (const subField of subFields) {
        const subRequired = subField.validation?.required === true
        let subValidator = buildFieldValidator(subField, subRequired)
        if (!subRequired) subValidator = subValidator.optional()
        shape[subField.id] = subValidator
      }

      let arraySchema = z.array(z.object(shape))
      if (v?.minItems) arraySchema = arraySchema.min(v.minItems, `Add at least ${v.minItems}`)
      if (v?.maxItems) arraySchema = arraySchema.max(v.maxItems)
      return arraySchema
    }

    default: {
      // Fallback for unknown field types — accept anything
      return z.unknown()
    }
  }
}

/**
 * Checks whether a field's condition is met based on the current form data.
 * If the field has no condition, it's always active.
 */
function isConditionMet(
  field: FieldDef,
  allData: Record<string, unknown>
): boolean {
  if (!field.condition) return true
  return allData[field.condition.field] === field.condition.equals
}

/**
 * Builds a Zod object schema from an array of field definitions.
 * Used to validate one step's worth of form data at a time.
 */
export function buildStepValidator(
  fields: FieldDef[],
  allData?: Record<string, unknown>,
  skippedSections?: Set<string>
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of fields) {
    // Skip fields in skipped sections (step-level skip)
    if (skippedSections?.has(field.id)) continue

    const isRequired = field.validation?.required === true
    const conditionMet = isConditionMet(field, allData ?? {})
    const effectiveRequired = isRequired && conditionMet

    let validator = buildFieldValidator(field, effectiveRequired)

    // If not effectively required, make it optional so undefined is accepted
    if (!effectiveRequired) {
      validator = validator.optional()
    }

    shape[field.id] = validator
  }

  return z.object(shape)
}

/**
 * Validates a step's data against its field definitions.
 * Returns a map of field_id -> error_message, or null if everything is valid.
 */
export function validateStep(
  fields: FieldDef[],
  data: Record<string, unknown>,
  allData?: Record<string, unknown>
): Record<string, string> | null {
  // Merge step data into allData so conditions can reference same-step fields
  const merged = { ...(allData ?? {}), ...data }
  const schema = buildStepValidator(fields, merged)
  const result = schema.safeParse(data)

  if (result.success) return null

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    // Use the first path segment as the field id
    const fieldId = String(issue.path[0] ?? "unknown")
    // Keep first error per field (don't overwrite)
    if (!errors[fieldId]) {
      errors[fieldId] = issue.message
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}
