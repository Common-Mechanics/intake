"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface NumberFieldProps {
  id: string
  label: string
  help?: string
  placeholder?: string
  value: number | ""
  onChange: (value: number | "") => void
  error?: string
  readOnly?: boolean
  disabled?: boolean
  min?: number
  max?: number
}

export function NumberField({
  id,
  label,
  help,
  placeholder,
  value,
  onChange,
  error,
  readOnly,
  disabled,
  min,
  max,
}: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value
          if (raw === "") {
            onChange("")
          } else {
            onChange(Number(raw))
          }
        }}
        readOnly={readOnly}
        disabled={disabled}
        min={min}
        max={max}
        aria-invalid={!!error}
        className={cn(
          "min-h-12",
          error && "border-destructive ring-3 ring-destructive/20"
        )}
      />
      {help && (
        <p className="text-sm text-muted-foreground">{help}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
