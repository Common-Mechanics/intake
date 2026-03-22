"use client"

import { useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useWizard } from "@/lib/intake/use-wizard"
import type { FormSchema, SavedData } from "@/lib/intake/schemas"
import { ProgressBar } from "./progress-bar"
import { StepRenderer } from "./step-renderer"
import { StepNav } from "./step-nav"
import { ConflictDialog } from "./conflict-dialog"

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

  // Adapt step-renderer's expected shape from schema types.
  // Cast fields to satisfy StepRenderer's looser FieldDefinition interface
  // which has an index signature that our strict FieldDef type lacks.
  const stepForRenderer = {
    id: wizard.currentStepDef.id,
    title: wizard.currentStepDef.title,
    description: wizard.currentStepDef.description,
    hint: wizard.currentStepDef.hint,
    optional: wizard.currentStepDef.optional ? true : undefined,
    skipLabel: wizard.currentStepDef.optional?.label,
    skipConsequences: wizard.currentStepDef.optional?.consequences,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fields: wizard.currentStepDef.fields as any,
  }

  const currentValues = wizard.values[wizard.currentStepDef.id] ?? {}

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Progress bar */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
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
                headingRef={stepHeadingRef}
              />
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
