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
  required?: boolean
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
  required,
}: TextFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {!required && <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>}
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
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        className={cn(
          "min-h-12",
          error && "border-destructive ring-3 ring-destructive/20"
        )}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>
      )}
      {help && (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">{help}</p>
      )}
    </div>
  )
}
