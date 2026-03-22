"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, FileText, AlertCircle } from "lucide-react"
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
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Bulk Import</Label>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist">
        <button
          type="button"
          id={csvTabId}
          role="tab"
          aria-selected={mode === "csv"}
          aria-controls={csvPanelId}
          onClick={() => {
            setMode("csv")
            setPreview(null)
            setParseError(null)
          }}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "csv"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          CSV Paste
        </button>
        <button
          type="button"
          id={jsonTabId}
          role="tab"
          aria-selected={mode === "json"}
          aria-controls={jsonPanelId}
          onClick={() => {
            setMode("json")
            setPreview(null)
            setParseError(null)
          }}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "json"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          JSON Upload
        </button>
      </div>

      {mode === "csv" && (
        <div
          className="flex flex-col gap-3"
          role="tabpanel"
          id={csvPanelId}
          aria-labelledby={csvTabId}
        >
          <p className="text-sm text-muted-foreground">
            Columns: {fields.map((f) => f.label).join(", ")}
          </p>
          <Textarea
            id={`${id}-csv`}
            placeholder={fields.map((f) => f.label).join(", ") + "\nvalue1, value2, ..."}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value)
              setPreview(null)
              setParseError(null)
            }}
            rows={6}
            disabled={disabled}
          />
        </div>
      )}

      {mode === "json" && (
        <div
          className="flex flex-col gap-3"
          role="tabpanel"
          id={jsonPanelId}
          aria-labelledby={jsonTabId}
        >
          {/* File upload area with drag-and-drop support */}
          <label
            htmlFor={`${id}-file`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) handleFileRead(file)
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-ring hover:bg-muted/50",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            <Upload className="size-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Drop a .json file here or click to browse
            </span>
            <input
              id={`${id}-file`}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              disabled={disabled}
            />
          </label>

          <p className="text-sm text-muted-foreground">Or paste JSON directly:</p>
          <Textarea
            id={`${id}-json`}
            placeholder={exampleJSON}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value)
              setPreview(null)
              setParseError(null)
            }}
            rows={6}
            disabled={disabled}
            className="font-mono text-xs"
          />
        </div>
      )}

      {parseError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Parse error</AlertTitle>
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {preview && (
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit">
            {preview.length} {preview.length === 1 ? "entry" : "entries"} found
          </Badge>
          <div className="max-h-40 overflow-y-auto rounded-md bg-muted/50 p-3 text-xs">
            {preview.slice(0, 5).map((entry, i) => (
              <div key={i} className="py-1 border-b border-border last:border-0">
                {fields.map((f) => (
                  <span key={f.id} className="mr-3">
                    <span className="text-muted-foreground">{f.label}:</span>{" "}
                    {String(entry[f.id] ?? "")}
                  </span>
                ))}
              </div>
            ))}
            {preview.length > 5 && (
              <p className="pt-2 text-muted-foreground">
                ...and {preview.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!preview ? (
          <Button
            variant="outline"
            size="lg"
            onClick={handleParse}
            disabled={
              disabled ||
              (mode === "csv" ? !csvText.trim() : !jsonText.trim())
            }
            className="min-h-12"
          >
            Preview
          </Button>
        ) : (
          <Button
            variant="default"
            size="lg"
            onClick={handleImport}
            disabled={disabled}
            className="min-h-12"
          >
            Import {preview.length} {preview.length === 1 ? "entry" : "entries"}
          </Button>
        )}
      </div>
    </div>
  )
}
