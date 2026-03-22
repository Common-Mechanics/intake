"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { HelpTooltip } from "@/components/intake/fields/help-tooltip"

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
  const inputProps = {
    id,
    type,
    placeholder,
    value: value ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    onBlur,
    readOnly,
    disabled,
    "aria-invalid": !!error || undefined,
    "aria-describedby": error ? `${id}-error` : help ? `${id}-help` : undefined,
  }

  const inputClassName = cn(
    "min-h-10",
    error && "border-destructive ring-3 ring-destructive/20"
  )

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {!required && <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>}
      </Label>
      {type === "url" ? (
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            {...inputProps}
            className={cn(inputClassName, "pl-9")}
          />
        </div>
      ) : (
        <Input {...inputProps} className={inputClassName} />
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">{error}</p>
      )}
      {help && (
        /* md:sr-only: on desktop, the help is shown in the sidebar (aria-hidden there).
           Here it stays accessible via aria-describedby but visually hidden on md+. */
        <div id={`${id}-help`} className="md:sr-only">
          <HelpTooltip text={help} />
        </div>
      )}
    </div>
  )
}
