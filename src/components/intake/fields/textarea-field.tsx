"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface TextareaFieldProps {
  id: string
  label: string
  help?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  error?: string
  readOnly?: boolean
  disabled?: boolean
  rows?: number
  maxLength?: number
  onBlur?: () => void
}

export function TextareaField({
  id,
  label,
  help,
  placeholder,
  value,
  onChange,
  error,
  readOnly,
  disabled,
  rows = 4,
  maxLength,
  onBlur,
}: TextareaFieldProps) {
  const currentLength = (value ?? "").length

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        readOnly={readOnly}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={!!error}
        className={cn(
          "min-h-[calc(1.5em*4+1rem)]",
          error && "border-destructive ring-3 ring-destructive/20"
        )}
      />
      <div className="flex justify-between gap-4">
        {help && (
          <p className="text-sm text-muted-foreground">{help}</p>
        )}
        {maxLength != null && (
          <p
            className={cn(
              "ml-auto text-sm text-muted-foreground tabular-nums",
              currentLength > maxLength * 0.9 && "text-destructive"
            )}
          >
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
