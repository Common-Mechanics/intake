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
      let schema = z.string({ error: "Please fill this in" })
      if (isRequired) schema = schema.min(v?.minLength ?? 1, "Please fill this in")
      else if (v?.minLength) schema = schema.min(v.minLength, `Needs at least ${v.minLength} characters`)
      if (v?.maxLength) schema = schema.max(v.maxLength)
      if (v?.pattern) schema = schema.regex(new RegExp(v.pattern), "Only letters, numbers, hyphens, and spaces are allowed")
      return schema
    }

    case "url": {
      const urlPattern = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i
      let schema = z.string({ error: "This field is required" })
      if (isRequired) schema = schema.min(1, "Please fill this in")
      if (v?.minLength) schema = schema.min(v.minLength)
      if (v?.maxLength) schema = schema.max(v.maxLength)
      return schema.refine(
        (val) => !val || urlPattern.test(val.trim()),
        { message: "Please enter a valid URL (e.g. www.example.com)" }
      )
    }

    case "number": {
      let schema = z.number({ error: "This needs to be a number" })
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
      let schema = z.string({ error: "Pick one of the options" })
      if (isRequired) schema = schema.min(1, "Pick one of the options")
      return schema
    }

    case "custom": {
      // Custom fields handle their own validation internally
      return z.unknown()
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

      const singularLabel = field.label.replace(/ies$/i, "y").replace(/ses$/i, "s").replace(/s$/i, "")
      let arraySchema = z.array(z.object(shape), { error: `Add at least one ${singularLabel.toLowerCase()}` })
      if (v?.minItems) arraySchema = arraySchema.min(v.minItems, `You need at least ${v.minItems} — add some more`)
      if (v?.maxItems) arraySchema = arraySchema.max(v.maxItems, `Too many — the maximum is ${v.maxItems}`)
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
 * Returns a map of error keys -> error messages, or null if valid.
 *
 * Error keys can be:
 * - "field_id" — top-level field error
 * - "field_id" — repeating group count error (e.g. "Add at least 3")
 * - "field_id.0.sub_field" — error on a sub-field inside a repeating entry
 *
 * This allows the UI to show errors on individual sub-fields within
 * repeating groups, not just a generic group-level message.
 */
export function validateStep(
  fields: FieldDef[],
  data: Record<string, unknown>,
  allData?: Record<string, unknown>
): Record<string, string> | null {
  const merged = { ...(allData ?? {}), ...data }
  const schema = buildStepValidator(fields, merged)
  const result = schema.safeParse(data)

  if (result.success) return null

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    // Build a dotted key from the full path: "categories.0.short_label"
    const fullKey = issue.path.join(".")
    // Also keep the top-level field ID for group-level display
    const fieldId = String(issue.path[0] ?? "unknown")

    if (issue.path.length >= 3) {
      // Sub-field error inside a repeating group: categories.0.short_label
      if (!errors[fullKey]) {
        errors[fullKey] = issue.message
      }
      // Also set a group-level summary if not already set
      if (!errors[fieldId]) {
        errors[fieldId] = "Some entries still need your attention"
      }
    } else if (issue.path.length === 1) {
      // Top-level field error or repeating group count error
      if (!errors[fieldId]) {
        errors[fieldId] = issue.message
      }
    } else {
      // Other nested paths
      if (!errors[fullKey]) {
        errors[fullKey] = issue.message
      }
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}
