"use client"

import { useCallback, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Plus, X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { FieldRenderer } from "../field-renderer"
import { BatchInput } from "./batch-input"

interface FieldDefinition {
  id: string
  type: string
  label: string
  help?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  required?: boolean
  validation?: Record<string, unknown>
  condition?: Record<string, unknown>
  [key: string]: unknown
}

interface RepeatingGroupValidation {
  minItems?: number
  maxItems?: number
  warnAbove?: number
  warnMessage?: string
}

interface BatchInputConfig {
  enabled: boolean
  csvColumns?: string[]
  jsonExample?: string
}

interface RepeatingGroupProps {
  id: string
  label: string
  help?: string
  fields: FieldDefinition[]
  value: Record<string, unknown>[]
  onChange: (value: Record<string, unknown>[]) => void
  error?: string
  /** Full errors map from wizard — contains nested keys like "categories.0.short_label" */
  allErrors?: Record<string, string>
  disabled?: boolean
  validation?: RepeatingGroupValidation
  batchInput?: BatchInputConfig
}

export function RepeatingGroup({
  id,
  label,
  help,
  fields,
  value = [],
  onChange,
  error,
  allErrors = {},
  disabled,
  validation,
  batchInput,
}: RepeatingGroupProps) {
  const entries = Array.isArray(value) ? value : []
  const minItems = validation?.minItems ?? 0
  const maxItems = validation?.maxItems
  const canRemove = entries.length > minItems
  const canAdd = maxItems == null || entries.length < maxItems

  /* Track which entries are expanded — new entries open by default */
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    return new Set(entries.map((_, i) => i))
  })

  const toggleExpanded = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const handleAdd = useCallback(() => {
    if (!canAdd) return
    const newEntry: Record<string, unknown> = {}
    for (const field of fields) {
      newEntry[field.id] = field.type === "checkbox" ? false : ""
    }
    const newIndex = entries.length
    onChange([...entries, newEntry])
    /* Auto-expand the new entry */
    setExpanded((prev) => { const next = new Set(prev); next.add(newIndex); return next })
  }, [canAdd, fields, entries, onChange])

  const handleRemove = useCallback(
    (index: number) => {
      if (!canRemove) return
      const removed = entries[index]
      const newEntries = entries.filter((_, i) => i !== index)
      onChange(newEntries)
      /* Clean up expanded state */
      setExpanded((prev) => {
        const next = new Set<number>()
        for (const i of prev) {
          if (i < index) next.add(i)
          else if (i > index) next.add(i - 1)
        }
        return next
      })
      toast("Entry removed", {
        action: {
          label: "Undo",
          onClick: () => {
            const restored = [...newEntries]
            restored.splice(index, 0, removed)
            onChange(restored)
          },
        },
      })
    },
    [canRemove, entries, onChange]
  )

  const handleEntryChange = useCallback(
    (index: number, fieldId: string, fieldValue: unknown) => {
      const updated = entries.map((entry, i) => {
        if (i !== index) return entry
        return { ...entry, [fieldId]: fieldValue }
      })
      onChange(updated)
    },
    [entries, onChange]
  )

  const handleBatchImport = useCallback(
    (imported: Record<string, unknown>[]) => {
      const startIndex = entries.length
      onChange([...entries, ...imported])
      /* Auto-expand imported entries */
      setExpanded((prev) => {
        const next = new Set(prev)
        for (let i = 0; i < imported.length; i++) next.add(startIndex + i)
        return next
      })
    },
    [entries, onChange]
  )

  const showWarning =
    validation?.warnAbove != null &&
    entries.length > validation.warnAbove &&
    validation.warnMessage

  /* Client-side uniqueness and duplicate tag validation */
  const duplicateErrors = useMemo(() => {
    const errors: Record<string, string> = {}
    if (entries.length < 2) return errors

    /* Check uniqueness across entries for text fields */
    for (const field of fields) {
      if (field.type !== "text") continue
      const seen = new Map<string, number>() // value → first index
      for (let i = 0; i < entries.length; i++) {
        const val = (entries[i][field.id] as string)?.trim().toLowerCase()
        if (!val) continue
        if (seen.has(val)) {
          errors[`${id}.${i}.${field.id}`] = `Duplicate — "${entries[i][field.id]}" is already used in entry ${(seen.get(val) ?? 0) + 1}`
        } else {
          seen.set(val, i)
        }
      }
    }

    /* Check for duplicate tags within comma-separated fields */
    for (let i = 0; i < entries.length; i++) {
      for (const field of fields) {
        const val = entries[i][field.id] as string
        if (!val || field.type !== "text") continue
        if (!val.includes(",")) continue // only check comma-separated fields
        const tags = val.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
        const uniqueTags = new Set(tags)
        if (uniqueTags.size < tags.length) {
          const dupes = tags.filter((t, idx) => tags.indexOf(t) !== idx)
          const uniqueDupes = [...new Set(dupes)]
          errors[`${id}.${i}.${field.id}`] = `Duplicate tags: ${uniqueDupes.join(", ")}`
        }
      }
    }

    return errors
  }, [entries, fields, id])

  /* Merge server errors with client-side duplicate errors */
  const mergedErrors = useMemo(() => {
    return { ...allErrors, ...duplicateErrors }
  }, [allErrors, duplicateErrors])

  return (
    <div className={cn(
      "flex flex-col gap-4 rounded-lg",
      error && "ring-2 ring-destructive/20 border-destructive p-4 -mx-1"
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label className="text-sm font-medium">{label}</Label>
          {help && (
            <p className="text-sm text-muted-foreground">{help}</p>
          )}
        </div>
        {showWarning && (
          <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {validation.warnMessage}
          </Badge>
        )}
      </div>

      {error && (
        <div id={`${id}-error`} role="alert" className="text-sm text-destructive flex flex-col gap-1">
          <p>{error}</p>
          {/* Show count-specific help when below minimum */}
          {validation?.minItems && entries.length < validation.minItems && (
            <p className="text-xs">You have {entries.length} — add at least {validation.minItems - entries.length} more</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {entries.map((entry, index) => {
          const firstFieldValue = entries[index]?.[fields[0]?.id] as string | undefined
          const singularLabel = label.replace(/ies$/i, "y").replace(/ses$/i, "s").replace(/s$/i, "")
          const itemTitle = firstFieldValue?.trim() ? firstFieldValue.trim() : `New ${singularLabel}`
          const isOpen = expanded.has(index)

          /* Collect sub-field errors for this entry from both server + duplicate checks */
          const entryErrors: Record<string, string> = {}
          const prefix = `${id}.${index}.`
          for (const [key, msg] of Object.entries(mergedErrors)) {
            if (key.startsWith(prefix)) {
              entryErrors[key.slice(prefix.length)] = msg
            }
          }
          const hasEntryErrors = Object.keys(entryErrors).length > 0

          return (
            <div
              key={index}
              className={cn(
                "border rounded-lg overflow-hidden transition-colors",
                disabled && "opacity-50",
                hasEntryErrors && "border-destructive/50"
              )}
            >
              {/* Accordion header — always visible */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleExpanded(index)}
              >
                <ChevronDown className={cn(
                  "size-4 text-muted-foreground shrink-0 transition-transform",
                  isOpen && "rotate-180"
                )} />
                <Badge variant="secondary" className="font-mono text-xs shrink-0">{index + 1}</Badge>
                <span className={cn(
                  "text-sm font-medium truncate flex-1",
                  hasEntryErrors && "text-destructive"
                )}>{itemTitle}</span>
                {hasEntryErrors && !isOpen && (
                  <span className="text-xs text-destructive shrink-0">
                    {Object.keys(entryErrors).length} {Object.keys(entryErrors).length === 1 ? "issue" : "issues"}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={(e) => { e.stopPropagation(); handleRemove(index) }}
                  disabled={!canRemove || disabled}
                  aria-label={`Remove ${itemTitle}`}
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              {/* Accordion body — collapsible */}
              {isOpen && (
                <div className="px-3 pb-3 pt-1 border-t">
                  <div className="flex flex-col gap-4">
                    {fields.map((field) => (
                      <FieldRenderer
                        key={field.id}
                        field={field}
                        value={entry[field.id]}
                        onChange={(val) => handleEntryChange(index, field.id, val)}
                        error={entryErrors[field.id]}
                        disabled={disabled}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
          <p>No {label.toLowerCase()} added yet</p>
          {validation?.minItems && validation.minItems > 0 && (
            <p className="text-xs">You&apos;ll need at least {validation.minItems} to continue</p>
          )}
        </div>
      )}

      {/* Batch import */}
      {batchInput?.enabled && (
        <BatchInput
          id={`${id}-batch`}
          fieldId={id}
          fields={fields}
          onImport={handleBatchImport}
          disabled={disabled}
        />
      )}

      <Button
        variant="outline"
        size="lg"
        onClick={handleAdd}
        disabled={!canAdd || disabled}
        className="w-full min-h-12"
      >
        <Plus data-icon="inline-start" />
        Add {label.replace(/ies$/i, "y").replace(/ses$/i, "s").replace(/s$/i, "")}
      </Button>
    </div>
  )
}
