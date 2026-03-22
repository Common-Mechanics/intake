"use client"

import { useEffect, useCallback, useRef, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useWizard } from "@/lib/intake/use-wizard"
import type { FormSchema, SavedData } from "@/lib/intake/schemas"
import { ProgressBar } from "./progress-bar"
import { StepRenderer } from "./step-renderer"
import { StepNav } from "./step-nav"
import { ConflictDialog } from "./conflict-dialog"
import { CompletionChecklist } from "./completion-checklist"

interface WizardShellProps {
  schema: FormSchema
  initialData: SavedData | null
  orgId: string
}

export function WizardShell({ schema, initialData, orgId }: WizardShellProps) {
  const wizard = useWizard(schema, initialData, orgId)
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)

  const scrollToFirstError = useCallback(() => {
    // Small delay to let React render the error state
    setTimeout(() => {
      const firstErrorId = Object.keys(wizard.errors)[0]
      if (firstErrorId) {
        const el = document.getElementById(firstErrorId)
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
        el?.focus()
      }
    }, 50)
  }, [wizard.errors])

  const handleNext = useCallback(() => {
    if (wizard.isLastStep) {
      // On last step, validate then save
      const valid = wizard.validateCurrentStep()
      if (valid) {
        wizard.saveToServer()
      } else {
        scrollToFirstError()
      }
    } else {
      const moved = wizard.nextStep()
      if (!moved) scrollToFirstError()
    }
  }, [wizard, scrollToFirstError])

  // Focus heading and scroll to top on step transitions
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    // Small delay to let the new step render
    setTimeout(() => {
      stepHeadingRef.current?.focus()
    }, 100)
  }, [wizard.currentStep])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const hasUnsavedChanges = Object.values(wizard.values).some(
      stepValues => Object.keys(stepValues).length > 0
    )

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && wizard.saveStatus !== "saved") {
        e.preventDefault()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [wizard.values, wizard.saveStatus])

  const handleFieldChange = useCallback(
    (fieldId: string, value: unknown) => {
      wizard.setFieldValue(wizard.currentStepDef.id, fieldId, value)
    },
    [wizard]
  )

  // Keyboard shortcut: Ctrl+Enter = Next
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleNext])

  /* Build category options from the categories step for use in editor dropdowns */
  const categoryEntries = useMemo(() => {
    const cats = wizard.values["categories"]?.["categories"] as Record<string, unknown>[] | undefined
    if (!cats || !Array.isArray(cats)) return []
    return cats.filter((c) => (c.short_label as string)?.trim())
  }, [wizard.values])

  const categoryOptions = useMemo(() => {
    return categoryEntries.map((c) => ({
      label: c.short_label as string,
      value: (c.short_label as string).toLowerCase(),
    }))
  }, [categoryEntries])

  /* Auto-populate editors from categories when arriving at editorial-team step */
  useEffect(() => {
    if (wizard.currentStepDef.id !== "editorial-team") return
    const currentEditors = wizard.values["editorial-team"]?.["editors"] as Record<string, unknown>[] | undefined
    if (currentEditors && currentEditors.length > 0) return // already has editors
    if (categoryEntries.length === 0) return

    const editors: Record<string, unknown>[] = categoryEntries.map((cat) => ({
      editor_name: `${cat.short_label} Editor`,
      category: (cat.short_label as string).toLowerCase(),
      is_spotlight: false,
      expertise: `You are the ${cat.short_label} Editor — an expert in ${cat.full_name || cat.short_label}. You specialize in:\n\n- [Sub-area 1]\n- [Sub-area 2]\n- [Sub-area 3]\n\nYou notice when [what makes your perspective unique]. You track [key organizations and developments in this area].`,
    }))
    /* Add Spotlight editor */
    editors.push({
      editor_name: "Spotlight Editor",
      category: "spotlight",
      is_spotlight: true,
      expertise: "You are the Spotlight Editor. Your job is to find the most interesting, surprising, or entertaining content — podcasts worth listening to, videos worth watching, demos worth trying, and stories that make people smile or think differently.\n\nYou look for:\n- Notable podcast episodes and interviews\n- Compelling video content and documentaries\n- Interactive demos, tools, and visualizations\n- Unusual angles, human interest stories, and cultural moments\n\nYou notice when something is genuinely interesting to a curious professional, not just technically relevant.",
    })
    wizard.setFieldValue("editorial-team", "editors", editors)
  }, [wizard.currentStepDef.id, categoryEntries, wizard.values, wizard.setFieldValue])

  // Adapt step-renderer's expected shape from schema types.
  // For the editorial-team step, inject dynamic category options from step 3.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rendererFields = wizard.currentStepDef.fields as any[]

  if (wizard.currentStepDef.id === "editorial-team" && categoryOptions.length > 0) {
    rendererFields = rendererFields.map((field: Record<string, unknown>) => {
      if (field.type !== "repeating" || !Array.isArray(field.fields)) return field
      return {
        ...field,
        fields: (field.fields as Record<string, unknown>[]).map((subField) => {
          if (subField.id !== "category") return subField
          /* Turn category text input into a select with dynamic options.
             Editors can cover 1+ categories, so users type comma-separated values.
             The select shows the available options but the field stays text-based. */
          const allOptions = [
            ...categoryOptions,
            { label: "Spotlight", value: "spotlight" },
          ]
          return {
            ...subField,
            type: "select",
            options: allOptions,
            help: "Which category does this editor cover? Each category can only be assigned to one editor.",
          }
        }),
      }
    })
  }

  const stepForRenderer = {
    id: wizard.currentStepDef.id,
    title: wizard.currentStepDef.title,
    description: wizard.currentStepDef.description,
    hint: wizard.currentStepDef.hint,
    optional: wizard.currentStepDef.optional ? true : undefined,
    skipLabel: wizard.currentStepDef.optional?.label,
    skipConsequences: wizard.currentStepDef.optional?.consequences,
    fields: rendererFields,
  }

  const currentValues = wizard.values[wizard.currentStepDef.id] ?? {}

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header + progress bar */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <h1 className="text-base font-semibold tracking-tight">Onboarding Form</h1>
          </div>
          <ProgressBar
            steps={schema.steps}
            currentStep={wizard.currentStep}
            completedSteps={wizard.completedSteps}
            skippedSections={wizard.skippedSections}
            onStepClick={wizard.goToStep}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <div
          className={cn(
            "mx-auto w-full flex-1 py-6 md:py-10",
            "max-w-2xl",
            /* Mobile: edge-to-edge with padding inside */
            "px-0 md:px-4"
          )}
        >
          {/* Desktop: card wrapper. Mobile: no card chrome */}
          <div key={`mobile-${wizard.currentStep}`} className="md:hidden px-5 py-2 animate-step-enter">
            <StepRenderer
              step={stepForRenderer}
              values={currentValues}
              onChange={handleFieldChange}
              errors={wizard.errors}
              isSkipped={wizard.skippedSections.has(wizard.currentStepDef.id)}
              onToggleSkip={wizard.toggleSkipSection}
              onFieldBlur={wizard.validateField}
              headingRef={stepHeadingRef}
            />
            {wizard.isLastStep && (
              <CompletionChecklist
                steps={schema.steps}
                values={wizard.values}
                completedSteps={wizard.completedSteps}
                skippedSections={wizard.skippedSections}
                onGoToStep={wizard.goToStep}
              />
            )}
          </div>

          <Card key={`desktop-${wizard.currentStep}`} className="hidden md:flex shadow-sm animate-step-enter">
            <CardContent className="py-6 px-8">
              <StepRenderer
                step={stepForRenderer}
                values={currentValues}
                onChange={handleFieldChange}
                errors={wizard.errors}
                isSkipped={wizard.skippedSections.has(wizard.currentStepDef.id)}
                onToggleSkip={wizard.toggleSkipSection}
                onFieldBlur={wizard.validateField}
                headingRef={stepHeadingRef}
              />
              {wizard.isLastStep && (
                <CompletionChecklist
                  steps={schema.steps}
                  values={wizard.values}
                  completedSteps={wizard.completedSteps}
                  skippedSections={wizard.skippedSections}
                  onGoToStep={wizard.goToStep}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom nav — extra bottom padding on mobile to clear fixed nav */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      <StepNav
        canGoPrev={wizard.canGoPrev}
        canGoNext={wizard.canGoNext}
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        onPrev={wizard.prevStep}
        onNext={handleNext}
        onSave={wizard.saveToServer}
        saveStatus={wizard.saveStatus}
        lastSaved={wizard.lastSaved}
        hasDraft={wizard.hasDraft}
      />

      {/* Conflict resolution dialog */}
      <ConflictDialog
        isOpen={wizard.saveStatus === "conflict"}
        onResolve={wizard.resolveConflict}
        conflictData={wizard.conflictData}
      />
    </div>
  )
}
