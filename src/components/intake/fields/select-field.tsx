"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CategoryDot } from "@/lib/intake/category-colors"
import { HelpTooltip } from "@/components/intake/fields/help-tooltip"

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  id: string
  label: string
  help?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  error?: string
  readOnly?: boolean
  disabled?: boolean
  options: SelectOption[]
  onBlur?: () => void
  required?: boolean
  /** Maps option values to category color indices for showing colored dots */
  colorMap?: Record<string, number>
}

export function SelectField({
  id,
  label,
  help,
  placeholder = "Select an option...",
  value,
  onChange,
  error,
  disabled,
  options,
  onBlur,
  required,
  colorMap,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {!required && <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>}
        </Label>
        {help && <HelpTooltip text={help} />}
      </div>
      <Select
        value={value ?? ""}
        onValueChange={(val) => onChange(val ?? "")}
        disabled={disabled}
        onOpenChange={(open) => { if (!open) onBlur?.() }}
      >
        <SelectTrigger
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
          className={cn(
            "w-full min-h-12",
            error && "border-destructive ring-3 ring-destructive/20"
          )}
        >
          {/* Show color dot next to selected value when colorMap is provided */}
          {colorMap && value && colorMap[value] !== undefined ? (
            <span className="flex items-center gap-1.5">
              <CategoryDot index={colorMap[value]} />
              <SelectValue placeholder={placeholder} />
            </span>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-1.5">
                {colorMap && colorMap[option.value] !== undefined && (
                  <CategoryDot index={colorMap[option.value]} />
                )}
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  )
}
