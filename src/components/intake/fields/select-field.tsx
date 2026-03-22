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
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Select
        value={value ?? ""}
        onValueChange={(val) => onChange(val ?? "")}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={!!error}
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
      {help && (
        <p className="text-sm text-muted-foreground">{help}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
