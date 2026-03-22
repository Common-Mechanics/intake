"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

interface SkipSectionProps {
  label: string
  consequences: string
  checked: boolean
  onChange: (checked?: boolean) => void
  disabled?: boolean
  stepId?: string
}

export function SkipSection({
  label,
  consequences,
  checked,
  onChange,
  disabled,
  stepId,
}: SkipSectionProps) {
  const checkboxId = `skip-section-${stepId ?? 'default'}`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 min-h-12">
        <Checkbox
          id={checkboxId}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
        <Label
          htmlFor={checkboxId}
          className="text-sm font-medium leading-normal cursor-pointer"
        >
          {label}
        </Label>
      </div>

      {checked && (
        <Alert variant="info">
          <Info aria-hidden="true" className="text-muted-foreground" />
          <AlertTitle>Good to know</AlertTitle>
          <AlertDescription>{consequences}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
