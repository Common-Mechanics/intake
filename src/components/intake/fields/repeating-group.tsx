"use client"

import { useCallback, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Plus, X, ChevronDown, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { FieldRenderer } from "../field-renderer"
import { BatchInput } from "./batch-input"
import { CategoryDot } from "@/lib/intake/category-colors"

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
  allErrors?: Record<string, string>
  disabled?: boolean
  validation?: RepeatingGroupValidation
  batchInput?: BatchInputConfig
  defaultEntries?: Record<string, unknown>[]
  showColorDots?: boolean
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
  defaultEntries,
  showColorDots,
}: RepeatingGroupProps) {
  const entries = Array.isArray(value) ? value : []

  const [didPrefill, setDidPrefill] = useState(false)
  if (!didPrefill && entries.length === 0 && defaultEntries && defaultEntries.length > 0) {
    setDidPrefill(true)
    setTimeout(() => onChange(defaultEntries), 0)
  }

  const minItems = validation?.minItems ?? 0
  const maxItems = validation?.maxItems
  const canRemove = entries.length > minItems
  const canAdd = maxItems == null || entries.length < maxItems

  /* Determine rendering mode based on sub-field count */
  const fieldCount = fields.length
  const mode = fieldCount <= 1 ? "inline" : fieldCount <= 3 ? "compact" : "accordion"

  /* Only first entry open by default — less overwhelming initial impression */
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set(entries.length > 0 ? [0] : []))

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
    setExpanded((prev) => { const next = new Set(prev); next.add(newIndex); return next })
  }, [canAdd, fields, entries, onChange])

  const handleRemove = useCallback(
    (index: number) => {
      if (!canRemove) return
      const removed = entries[index]
      const newEntries = entries.filter((_, i) => i !== index)
      onChange(newEntries)
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
      const updated = entries.map((entry, i) =>
        i !== index ? entry : { ...entry, [fieldId]: fieldValue }
      )
      onChange(updated)
    },
    [entries, onChange]
  )

  const handleBatchImport = useCallback(
    (imported: Record<string, unknown>[]) => {
      const startIndex = entries.length
      onChange([...entries, ...imported])
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

  const duplicateErrors = useMemo(() => {
    const errors: Record<string, string> = {}
    if (entries.length < 2) return errors
    for (const field of fields) {
      if (field.type !== "text" && field.type !== "select") continue
      const seen = new Map<string, number>()
      for (let i = 0; i < entries.length; i++) {
        const val = (entries[i][field.id] as string)?.trim().toLowerCase()
        if (!val) continue
        if (seen.has(val)) {
          errors[`${id}.${i}.${field.id}`] = `Duplicate — already in entry ${(seen.get(val) ?? 0) + 1}`
        } else {
          seen.set(val, i)
        }
      }
    }
    for (let i = 0; i < entries.length; i++) {
      for (const field of fields) {
        const val = entries[i][field.id] as string
        if (!val || field.type !== "text") continue
        if (!val.includes(",") && field.id !== "auto_tags") continue
        const tags = val.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
        if (field.id === "auto_tags" && tags.length < 2) {
          errors[`${id}.${i}.${field.id}`] = "Add at least 2 tags, separated by commas"
          continue
        }
        const uniqueTags = new Set(tags)
        if (uniqueTags.size < tags.length) {
          const dupes = tags.filter((t, idx) => tags.indexOf(t) !== idx)
          errors[`${id}.${i}.${field.id}`] = `Duplicate tags: ${[...new Set(dupes)].join(", ")}`
        }
      }
    }
    return errors
  }, [entries, fields, id])

  const mergedErrors = useMemo(() => ({ ...allErrors, ...duplicateErrors }), [allErrors, duplicateErrors])

  const singularLabel = label.replace(/ies$/i, "y").replace(/ses$/i, "s").replace(/s$/i, "")

  /* Get entry errors for a given index */
  function getEntryErrors(index: number): Record<string, string> {
    const result: Record<string, string> = {}
    const prefix = `${id}.${index}.`
    for (const [key, msg] of Object.entries(mergedErrors)) {
      if (key.startsWith(prefix)) result[key.slice(prefix.length)] = msg
    }
    return result
  }

  return (
    <div className={cn(
      "flex flex-col gap-3",
      error && "ring-2 ring-destructive/20 rounded-lg border-destructive p-4 -mx-1"
    )}>
      {/* Header — label, count, and import on one line; help below */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {entries.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {entries.length}{maxItems ? `/${maxItems}` : ""}
            </span>
          )}
          {showWarning && (
            <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs">
              {validation.warnMessage}
            </Badge>
          )}
          {batchInput?.enabled && (
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground shrink-0 ml-auto"
                    disabled={disabled}
                  />
                }
              >
                <Upload aria-hidden="true" className="size-3" />
                Import
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Import {label}</DialogTitle>
                </DialogHeader>
                <BatchInput
                  id={`${id}-batch`}
                  fieldId={id}
                  fields={fields}
                  onImport={handleBatchImport}
                  disabled={disabled}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
        {help && (
          <p className="text-[13px] leading-relaxed text-muted-foreground">{help}</p>
        )}
      </div>

      {error && (
        <div id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          <p>{error}</p>
          {validation?.minItems && entries.length < validation.minItems && (
            <p className="text-xs font-normal mt-0.5">You have {entries.length} — add at least {validation.minItems - entries.length} more</p>
          )}
        </div>
      )}

      {/* ── INLINE MODE: single-field entries as a clean list ── */}
      {mode === "inline" && (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry, index) => {
            const field = fields[0]
            const entryErrors = getEntryErrors(index)
            const errorMsg = entryErrors[field.id]
            return (
              <div key={index} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  {showColorDots && <CategoryDot index={index} />}
                  <Input
                    value={(entry[field.id] as string) ?? ""}
                    onChange={(e) => handleEntryChange(index, field.id, e.target.value)}
                    placeholder={field.placeholder ?? `${singularLabel}\u2026`}
                    aria-label={`${singularLabel} ${index + 1}`}
                    disabled={disabled}
                    aria-invalid={!!errorMsg || undefined}
                    className={cn("h-8 text-sm", errorMsg && "border-destructive")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(index)}
                    disabled={!canRemove || disabled}
                    aria-label={`Remove entry ${index + 1}`}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
                {errorMsg && (
                  <p className="text-xs text-destructive pl-0.5">{errorMsg}</p>
                )}
              </div>
            )
          })}
          {canAdd && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              disabled={disabled}
              className="self-start mt-1 h-7 text-xs"
            >
              <Plus className="size-3" />
              Add {singularLabel.toLowerCase()}
            </Button>
          )}
        </div>
      )}

      {/* ── COMPACT MODE: 2-3 fields per entry, no accordion ── */}
      {mode === "compact" && (
        <div className="flex flex-col gap-4">
          {entries.map((entry, index) => {
            const entryErrors = getEntryErrors(index)
            const hasEntryErrors = Object.keys(entryErrors).length > 0
            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 py-3 px-4 rounded-md border bg-card",
                  hasEntryErrors && "border-destructive/40",
                  disabled && "opacity-50"
                )}
              >
                {showColorDots && <CategoryDot index={index} className="mt-2.5" />}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr,1fr] gap-x-3 gap-y-2">
                  {fields.map((field) => (
                    <div key={field.id} className={cn(
                      "flex flex-col gap-0.5",
                      fields.length % 2 !== 0 && field === fields[fields.length - 1] && "md:col-span-2"
                    )}>
                      <FieldRenderer
                        field={{ ...field, help: undefined }}
                        value={entry[field.id]}
                        onChange={(val) => handleEntryChange(index, field.id, val)}
                        error={entryErrors[field.id]}
                        disabled={disabled}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 mt-1 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(index)}
                  disabled={!canRemove || disabled}
                  aria-label={`Remove entry ${index + 1}`}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ACCORDION MODE: 4+ fields, collapsible ── */}
      {mode === "accordion" && (
        <div className="flex flex-col gap-4">
          {entries.map((entry, index) => {
            const firstFieldValue = entries[index]?.[fields[0]?.id] as string | undefined
            const itemTitle = firstFieldValue?.trim() ? firstFieldValue.trim() : `New ${singularLabel}`
            const isOpen = expanded.has(index)
            const entryErrors = getEntryErrors(index)
            const hasEntryErrors = Object.keys(entryErrors).length > 0

            return (
              <div
                key={index}
                className={cn(
                  "border rounded-lg overflow-hidden",
                  disabled && "opacity-50",
                  hasEntryErrors && "border-destructive/50"
                )}
              >
                {/* Use div+role instead of nested buttons to avoid hydration error */}
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2 px-3 py-2 w-full text-left cursor-pointer hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => toggleExpanded(index)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpanded(index) } }}
                  aria-expanded={isOpen}
                >
                  <ChevronDown aria-hidden="true" className={cn(
                    "size-3.5 text-muted-foreground shrink-0 transition-transform",
                    isOpen && "rotate-180"
                  )} />
                  {showColorDots && <CategoryDot index={index} />}
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
                    className="size-6 shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleRemove(index) }}
                    disabled={!canRemove || disabled}
                    aria-label={`Remove ${itemTitle}`}
                  >
                    <X className="size-3" />
                  </Button>
                </div>

                {isOpen && (
                  <div className="px-3 pb-3 pt-2 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-3">
                      {fields.map((field) => {
                        const spanFull = field.type === "textarea" || field.type === "checkbox"
                        return (
                          <div key={field.id} className={cn(spanFull && "md:col-span-2")}>
                            <FieldRenderer
                              field={field}
                              value={entry[field.id]}
                              onChange={(val) => handleEntryChange(index, field.id, val)}
                              error={entryErrors[field.id]}
                              disabled={disabled}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state — minimal, just a hint next to the add button */}
      {entries.length === 0 && validation?.minItems && validation.minItems > 0 && (
        <p className="text-xs text-muted-foreground">
          You&apos;ll need at least {validation.minItems} to continue
        </p>
      )}

      {/* Add button — only for compact/accordion modes (inline has its own) */}
      {mode !== "inline" && (
        <Button
          variant="outline"
          onClick={handleAdd}
          disabled={!canAdd || disabled}
          className="self-start h-9 text-sm"
        >
          <Plus className="size-3.5" />
          Add {singularLabel}
        </Button>
      )}
    </div>
  )
}
