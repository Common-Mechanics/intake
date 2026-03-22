"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface CheckboxFieldProps {
  id: string
  label: string
  help?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function CheckboxField({
  id,
  label,
  help,
  checked,
  onChange,
  disabled,
}: CheckboxFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3 min-h-12">
        <Checkbox
          id={id}
          checked={checked ?? false}
          onCheckedChange={onChange}
          disabled={disabled}
          className="mt-0.5"
        />
        <Label
          htmlFor={id}
          className="text-sm font-medium leading-normal cursor-pointer"
        >
          {label}
        </Label>
      </div>
      {help && (
        <p className="text-sm text-muted-foreground pl-7">{help}</p>
      )}
    </div>
  )
}
