"use client"

import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FieldRenderer } from "../field-renderer"

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

interface RepeatingGroupProps {
  id: string
  label: string
  help?: string
  fields: FieldDefinition[]
  value: Record<string, unknown>[]
  onChange: (value: Record<string, unknown>[]) => void
  error?: string
  disabled?: boolean
  validation?: RepeatingGroupValidation
}

export function RepeatingGroup({
  id,
  label,
  help,
  fields,
  value = [],
  onChange,
  error,
  disabled,
  validation,
}: RepeatingGroupProps) {
  const entries = Array.isArray(value) ? value : []
  const minItems = validation?.minItems ?? 0
  const maxItems = validation?.maxItems
  const canRemove = entries.length > minItems
  const canAdd = maxItems == null || entries.length < maxItems

  const handleAdd = useCallback(() => {
    if (!canAdd) return
    // Create empty entry with default empty values for each field
    const newEntry: Record<string, unknown> = {}
    for (const field of fields) {
      newEntry[field.id] = field.type === "checkbox" ? false : ""
    }
    onChange([...entries, newEntry])
  }, [canAdd, fields, entries, onChange])

  const handleRemove = useCallback(
    (index: number) => {
      if (!canRemove) return
      const updated = entries.filter((_, i) => i !== index)
      onChange(updated)
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

  const showWarning =
    validation?.warnAbove != null &&
    entries.length > validation.warnAbove &&
    validation.warnMessage

  return (
    <div className="flex flex-col gap-4">
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
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex flex-col gap-4">
        {entries.map((entry, index) => (
          <Card key={index} size="sm" className={cn(disabled && "opacity-50")}>
            <CardHeader>
              <CardTitle className="text-sm">#{index + 1}</CardTitle>
              <CardAction>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(index)}
                  disabled={!canRemove || disabled}
                  aria-label={`Remove entry ${index + 1}`}
                >
                  <X />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {fields.map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={entry[field.id]}
                    onChange={(val) => handleEntryChange(index, field.id, val)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        size="lg"
        onClick={handleAdd}
        disabled={!canAdd || disabled}
        className="w-full min-h-12"
      >
        <Plus data-icon="inline-start" />
        Add {label.replace(/s$/, "")}
      </Button>
    </div>
  )
}
