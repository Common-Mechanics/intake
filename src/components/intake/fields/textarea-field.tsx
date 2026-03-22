"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { HelpTooltip } from "@/components/intake/fields/help-tooltip"

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
  required?: boolean
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
  required,
}: TextareaFieldProps) {
  const currentLength = (value ?? "").length

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {!required && <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>}
        </Label>
        {/* Short textareas get tooltip; long ones get inline help below the input */}
        {help && rows < 4 && <HelpTooltip text={help} />}
      </div>
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
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        className={cn(
          "min-h-[calc(1.5em*4+1rem)]",
          error && "border-destructive ring-3 ring-destructive/20"
        )}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">{error}</p>
      )}
      <div className="flex justify-between gap-4">
        {/* Important textareas (rows >= 4) show help inline below the input */}
        {help && rows >= 4 ? (
          <HelpTooltip text={help} alwaysVisible />
        ) : (
          <span />
        )}
        {maxLength != null && (
          <p
            className={cn(
              "ml-auto text-sm text-muted-foreground tabular-nums",
              currentLength >= maxLength
                ? "text-destructive"
                : currentLength > maxLength * 0.95
                  ? "text-destructive/70"
                  : ""
            )}
          >
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}
