"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface TextFieldProps {
  id: string
  label: string
  help?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  error?: string
  readOnly?: boolean
  disabled?: boolean
  type?: "text" | "url"
  onBlur?: () => void
}

export function TextField({
  id,
  label,
  help,
  placeholder,
  value,
  onChange,
  error,
  readOnly,
  disabled,
  type = "text",
  onBlur,
}: TextFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        readOnly={readOnly}
        disabled={disabled}
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
