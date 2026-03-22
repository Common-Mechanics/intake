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
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {!required && <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>}
      </Label>
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
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>
      )}
      {help && (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">{help}</p>
      )}
    </div>
  )
}
