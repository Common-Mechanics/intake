"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { HelpTooltip } from "@/components/intake/fields/help-tooltip"

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
  onBlur?: () => void
  required?: boolean
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
  onBlur,
  required,
}: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {!required && <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>}
      </Label>
      <Input
        id={id}
        name={id}
        type="number"
        inputMode="numeric"
        autoComplete="off"
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
        onBlur={onBlur}
        readOnly={readOnly}
        disabled={disabled}
        min={min}
        max={max}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        className={cn(
          "min-h-10",
          error && "border-destructive ring-3 ring-destructive/20"
        )}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">{error}</p>
      )}
      {help && (
        /* md:sr-only: on desktop, help is shown in the sidebar (aria-hidden there).
           Here it stays accessible via aria-describedby but visually hidden on md+. */
        <div id={`${id}-help`} className="md:sr-only">
          <HelpTooltip text={help} />
        </div>
      )}
    </div>
  )
}
