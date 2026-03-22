"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface FieldDefinition {
  id: string
  label: string
  type: string
}

interface BatchInputProps {
  id: string
  fieldId: string
  fields: FieldDefinition[]
  onImport: (entries: Record<string, unknown>[]) => void
  disabled?: boolean
}

type TabMode = "csv" | "json"

/**
 * Parse CSV text into entries. Detects tab vs comma delimiter.
 * Handles quoted fields (e.g. "field with, comma").
 */
function parseCSV(
  text: string,
  fieldIds: string[]
): { entries: Record<string, unknown>[]; error?: string } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return { entries: [], error: "No data found" }

  // Detect delimiter: if first line has tabs, use tab; otherwise comma
  const delimiter = lines[0].includes("\t") ? "\t" : ","

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        // Handle escaped quotes ("")
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  // Check if first line looks like a header (matches field ids or labels)
  const firstLineParts = parseLine(lines[0])
  const lowerFieldIds = fieldIds.map((f) => f.toLowerCase())
  const isHeader = firstLineParts.some((p) =>
    lowerFieldIds.includes(p.toLowerCase())
  )

  const dataLines = isHeader ? lines.slice(1) : lines
  const entries: Record<string, unknown>[] = []

  for (const line of dataLines) {
    const parts = parseLine(line)
    const entry: Record<string, unknown> = {}
    fieldIds.forEach((fieldId, i) => {
      entry[fieldId] = parts[i] ?? ""
    })
    entries.push(entry)
  }

  return { entries }
}

function parseJSON(
  text: string,
  fieldIds: string[]
): { entries: Record<string, unknown>[]; error?: string } {
  try {
    const parsed = JSON.parse(text)
    const items = Array.isArray(parsed) ? parsed : [parsed]

    const entries = items.map((item) => {
      const entry: Record<string, unknown> = {}
      for (const fieldId of fieldIds) {
        entry[fieldId] = item[fieldId] ?? ""
      }
      return entry
    })

    return { entries }
  } catch {
    return { entries: [], error: "Invalid JSON. Please check the format." }
  }
}

export function BatchInput({
  id,
  fieldId,
  fields,
  onImport,
  disabled,
}: BatchInputProps) {
  const [mode, setMode] = useState<TabMode>("csv")
  const [csvText, setCsvText] = useState("")
  const [jsonText, setJsonText] = useState("")
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fieldIds = fields.map((f) => f.id)

  const handleParse = useCallback(() => {
    setParseError(null)
    setPreview(null)

    const result =
      mode === "csv"
        ? parseCSV(csvText, fieldIds)
        : parseJSON(jsonText, fieldIds)

    if (result.error) {
      setParseError(result.error)
      return
    }
    if (result.entries.length === 0) {
      setParseError("No entries found in the data.")
      return
    }

    setPreview(result.entries)
  }, [mode, csvText, jsonText, fieldIds])

  const handleImport = useCallback(() => {
    if (!preview) return
    onImport(preview)
    // Reset after import
    setPreview(null)
    setCsvText("")
    setJsonText("")
  }, [preview, onImport])

  /** Shared handler for reading a JSON file (used by both file input and drag-drop) */
  const handleFileRead = useCallback((file: File) => {
    if (!file || file.type !== "application/json") return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setJsonText(text)
    }
    reader.readAsText(file)
  }, [])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      handleFileRead(file)
      // Reset the input so the same file can be selected again
      e.target.value = ""
    },
    [handleFileRead]
  )

  const exampleJSON = JSON.stringify(
    [
      fields.reduce(
        (acc, f) => ({ ...acc, [f.id]: `example ${f.label.toLowerCase()}` }),
        {}
      ),
    ],
    null,
    2
  )

  // ARIA IDs scoped to this field instance to avoid collisions when
  // multiple batch inputs appear on the same page
  const csvTabId = `batch-tab-csv-${fieldId}`
  const jsonTabId = `batch-tab-json-${fieldId}`
  const csvPanelId = `batch-panel-csv-${fieldId}`
  const jsonPanelId = `batch-panel-json-${fieldId}`

  return (
    <div className="flex flex-col gap-3">
        {/* Compact tab toggle */}
        <div className="flex gap-1" role="tablist">
          {(["csv", "json"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              id={tab === "csv" ? csvTabId : jsonTabId}
              role="tab"
              aria-selected={mode === tab}
              onClick={() => { setMode(tab); setPreview(null); setParseError(null) }}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-colors",
                mode === tab
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "csv" ? "Paste CSV" : "Upload JSON"}
            </button>
          ))}
        </div>

        {mode === "csv" && (
          <div role="tabpanel" id={csvPanelId} aria-labelledby={csvTabId}>
            <Textarea
              id={`${id}-csv`}
              placeholder={fields.map((f) => f.label).join(", ") + "\nvalue1, value2, ..."}
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setPreview(null); setParseError(null) }}
              rows={3}
              disabled={disabled}
              className="text-xs resize-none"
            />
          </div>
        )}

        {mode === "json" && (
          <div role="tabpanel" id={jsonPanelId} aria-labelledby={jsonTabId} className="flex flex-col gap-2">
            <label
              htmlFor={`${id}-file`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileRead(f) }}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <Upload className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Drop .json or click</span>
              <input id={`${id}-file`} type="file" accept=".json" onChange={handleFileUpload} className="hidden" disabled={disabled} />
            </label>
            <Textarea
              id={`${id}-json`}
              placeholder={exampleJSON}
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setPreview(null); setParseError(null) }}
              rows={3}
              disabled={disabled}
              className="font-mono text-xs resize-none"
            />
          </div>
        )}

        {parseError && (
          <p className="text-xs text-destructive">{parseError}</p>
        )}

        {preview && (
          <p className="text-xs text-muted-foreground">
            {preview.length} {preview.length === 1 ? "entry" : "entries"} ready to import
          </p>
        )}

        <Button
          variant={preview ? "default" : "outline"}
          size="sm"
          onClick={preview ? handleImport : handleParse}
          disabled={disabled || (!preview && (mode === "csv" ? !csvText.trim() : !jsonText.trim()))}
          className="self-start h-7 text-xs"
        >
          {preview ? `Import ${preview.length}` : "Preview"}
        </Button>
    </div>
  )
}
