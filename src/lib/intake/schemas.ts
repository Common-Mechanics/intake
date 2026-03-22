import { z } from "zod"

// --- Field types ---

export const fieldTypeSchema = z.enum([
  "text",
  "url",
  "textarea",
  "number",
  "select",
  "checkbox",
  "repeating",
  "custom",
])

export const validationSchema = z.object({
  required: z.boolean().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
  warnAbove: z.number().optional(),
  warnMessage: z.string().optional(),
})

export const conditionSchema = z.object({
  field: z.string(),
  equals: z.unknown(),
})

export const selectOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
})

export const batchInputSchema = z.object({
  enabled: z.boolean(),
  csvColumns: z.array(z.string()).optional(),
  jsonExample: z.string().optional(),
})

// Recursive field definition — uses z.lazy for self-reference
export const fieldDefSchema: z.ZodType<FieldDef> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: fieldTypeSchema,
    label: z.string(),
    help: z.string().optional(),
    placeholder: z.string().optional(),
    defaultValue: z.unknown().optional(),
    readOnly: z.boolean().optional(),
    validation: validationSchema.optional(),
    condition: conditionSchema.optional(),
    options: z.array(selectOptionSchema).optional(),
    // Sub-fields for repeating groups
    fields: z.array(z.lazy(() => fieldDefSchema)).optional(),
    batchInput: batchInputSchema.optional(),
  })
)

export const stepDefSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  hint: z.string().optional(),
  fields: z.array(fieldDefSchema),
  optional: z
    .object({
      label: z.string(),
      consequences: z.string(),
    })
    .optional(),
})

export const formSchemaSchema = z.object({
  id: z.string(),
  version: z.number(),
  title: z.string(),
  steps: z.array(stepDefSchema),
})

// --- Saved data (what gets stored in GitHub) ---

export const savedDataSchema = z.object({
  schemaId: z.string(),
  schemaVersion: z.number(),
  orgId: z.string(),
  orgName: z.string(),
  data: z.record(z.string(), z.unknown()),
  skippedSections: z.array(z.string()),
  completedSteps: z.array(z.string()),
  lastSaved: z.string(),
  lastSavedBy: z.string().optional(),
  sha: z.string().optional(),
})

// --- Org index ---

export const orgStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
])

export const orgEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  schemaId: z.string(),
  createdAt: z.string(),
  lastModified: z.string(),
  status: orgStatusSchema,
  completedSteps: z.number(),
  totalSteps: z.number(),
})

export const orgIndexSchema = z.array(orgEntrySchema)

// --- Inferred TypeScript types ---

export type FieldType = z.infer<typeof fieldTypeSchema>
export type ValidationDef = z.infer<typeof validationSchema>
export type ConditionDef = z.infer<typeof conditionSchema>
export type SelectOption = z.infer<typeof selectOptionSchema>
export type BatchInputDef = z.infer<typeof batchInputSchema>

// Manual type for recursive FieldDef since z.infer doesn't work with z.lazy
export interface FieldDef {
  id: string
  type: FieldType
  label: string
  help?: string
  placeholder?: string
  defaultValue?: unknown
  readOnly?: boolean
  validation?: ValidationDef
  condition?: ConditionDef
  options?: SelectOption[]
  fields?: FieldDef[]
  batchInput?: BatchInputDef
}

export type StepDef = z.infer<typeof stepDefSchema>
export type FormSchema = z.infer<typeof formSchemaSchema>
export type SavedData = z.infer<typeof savedDataSchema>
export type OrgStatus = z.infer<typeof orgStatusSchema>
export type OrgEntry = z.infer<typeof orgEntrySchema>
