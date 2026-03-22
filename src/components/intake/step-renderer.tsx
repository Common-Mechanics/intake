"use client"

import { useCallback, useState, useMemo, type RefObject } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { FieldRenderer } from "./field-renderer"
import { SkipSection } from "./fields/skip-section"
import type { SectionDef } from "@/lib/intake/schemas"

interface FieldDefinition {
  id: string
  type: string
  label: string
  help?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  required?: boolean
  readOnly?: boolean
  rows?: number
  maxLength?: number
  min?: number
  max?: number
  fields?: FieldDefinition[]
  validation?: Record<string, unknown>
  condition?: Record<string, unknown>
  [key: string]: unknown
}

interface StepDefinition {
  id: string
  title: string
  description?: string
  fields: FieldDefinition[]
  sections?: SectionDef[]
}

interface StepRendererProps {
  step: StepDefinition
  values: Record<string, unknown>
  onChange: (fieldId: string, value: unknown) => void
  errors: Record<string, string>
  disabled?: boolean
  isSkipped?: boolean
  skippedSections?: Set<string>
  onToggleSkip?: (sectionOrStepId: string) => void
  onFieldBlur?: (fieldId: string) => void
  headingRef?: RefObject<HTMLHeadingElement | null>
  /** Extra content rendered between the step header and the fields */
  headerExtra?: React.ReactNode
}

export function StepRenderer({
  step,
  values,
  onChange,
  errors,
  disabled,
  isSkipped = false,
  skippedSections,
  onToggleSkip,
  onFieldBlur,
  headingRef,
  headerExtra,
}: StepRendererProps) {
  const handleFieldChange = useCallback(
    (fieldId: string) => (value: unknown) => {
      onChange(fieldId, value)
    },
    [onChange]
  )

  /* Build a field lookup map for quick access */
  const fieldMap = useMemo(() => {
    const map = new Map<string, FieldDefinition>()
    for (const field of step.fields) {
      map.set(field.id, field)
    }
    return map
  }, [step.fields])

  /* Track which collapsible sections are expanded */
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (step.sections) {
      for (const section of step.sections) {
        if (!section.collapsible || section.defaultOpen !== false) {
          initial.add(section.id)
        }
      }
    }
    return initial
  })

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }, [])

  /* Count filled fields in a section for collapsed badge */
  function sectionFillCount(sectionFields: string[]): { filled: number; total: number } {
    let filled = 0
    let total = 0
    for (const fieldId of sectionFields) {
      const field = fieldMap.get(fieldId)
      if (!field || field.type === "section") continue
      total++
      const val = values[fieldId]
      if (val !== undefined && val !== null && val !== "") {
        if (Array.isArray(val) && val.length === 0) continue
        filled++
      }
    }
    return { filled, total }
  }

  /* Render fields for a given list of field IDs */
  function renderFields(fieldIds: string[], sectionSkipped: boolean) {
    return (
      <div className={cn(
        "flex flex-col gap-5",
        sectionSkipped && "pointer-events-none opacity-40"
      )}>
        {fieldIds.map((fieldId) => {
          const field = fieldMap.get(fieldId)
          if (!field || field.type === "section") return null

          const isRequired = (field.validation as Record<string, unknown>)?.required === true

          return (
            <div key={field.id} className="flex flex-col gap-1.5">
              <FieldRenderer
                field={field}
                value={values[field.id]}
                onChange={handleFieldChange(field.id)}
                error={errors[field.id]}
                allErrors={errors}
                disabled={disabled || isSkipped || sectionSkipped}
                allValues={values}
                onBlur={onFieldBlur}
                required={isRequired}
              />
            </div>
          )
        })}
      </div>
    )
  }

  /* Section-based rendering (new path) */
  function renderSections() {
    if (!step.sections) return null

    return (
      <div className="flex flex-col gap-8">
        {step.sections.map((section) => {
          const isCollapsible = section.collapsible === true
          const isExpanded = expandedSections.has(section.id)
          const isSectionSkipped = skippedSections?.has(section.id) ?? false
          const { filled, total } = sectionFillCount(section.fields)
          const hasErrors = section.fields.some((fid) => errors[fid])

          return (
            <div key={section.id} className={cn(
              hasErrors && !isSectionSkipped && "border-l-2 border-destructive pl-4 -ml-4"
            )}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4">
                {isCollapsible ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
                    aria-expanded={isExpanded}
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "size-4 text-muted-foreground transition-transform",
                        !isExpanded && "-rotate-90"
                      )}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground group-hover:text-foreground transition-colors">
                      {section.label}
                    </span>
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {section.label}
                  </span>
                )}

                <div className="flex-1 h-px bg-border/50" />

                {/* Collapsed badge showing fill count */}
                {isCollapsible && !isExpanded && !isSectionSkipped && total > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {filled}/{total}
                  </span>
                )}

                {/* Skipped badge */}
                {isSectionSkipped && (
                  <span className="text-xs text-muted-foreground">Skipped</span>
                )}
              </div>

              {/* Section skip toggle (for optional collapsible sections) */}
              {section.optional && isExpanded && onToggleSkip && (
                <div className="mb-4">
                  <SkipSection
                    label={section.optional.label}
                    consequences={section.optional.consequences}
                    checked={isSectionSkipped}
                    onChange={() => onToggleSkip(section.id)}
                    disabled={disabled}
                    stepId={section.id}
                  />
                </div>
              )}

              {/* Section body — fields */}
              {(isExpanded || !isCollapsible) && (
                renderFields(section.fields, isSectionSkipped)
              )}
            </div>
          )
        })}
      </div>
    )
  }

  /* Fallback: legacy rendering without sections (scan for type:"section" separators) */
  function renderLegacy() {
    const sections: { label?: string; fields: FieldDefinition[] }[] = []
    let currentSection: { label?: string; fields: FieldDefinition[] } = { fields: [] }

    for (const field of step.fields) {
      if (field.type === "section") {
        if (currentSection.fields.length > 0 || sections.length === 0) {
          sections.push(currentSection)
        }
        currentSection = { label: field.label, fields: [] }
      } else {
        currentSection.fields.push(field)
      }
    }
    if (currentSection.fields.length > 0) {
      sections.push(currentSection)
    }

    return (
      <div className={cn(
        "flex flex-col gap-8 transition-opacity duration-200 motion-reduce:transition-none",
        isSkipped && "pointer-events-none opacity-40"
      )}>
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.label && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground shrink-0">
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            )}
            <div className="flex flex-col gap-5">
              {section.fields.map((field) => (
                <div key={field.id} className="flex flex-col gap-1.5">
                  <FieldRenderer
                    field={field}
                    value={values[field.id]}
                    onChange={handleFieldChange(field.id)}
                    error={errors[field.id]}
                    allErrors={errors}
                    disabled={disabled || isSkipped}
                    allValues={values}
                    onBlur={onFieldBlur}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step header */}
      <div className="flex flex-col gap-3">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl md:text-[28px] font-semibold tracking-tight leading-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
        >
          {step.title}
        </h2>
        {step.description && (
          <p className="text-[15px] text-foreground/60 leading-relaxed max-w-2xl">
            {step.description}
          </p>
        )}
      </div>

      {headerExtra}

      {/* Fields — section-based or legacy */}
      {step.sections ? renderSections() : renderLegacy()}
    </div>
  )
}
