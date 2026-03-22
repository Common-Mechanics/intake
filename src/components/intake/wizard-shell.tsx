"use client"

import { useEffect, useCallback, useRef, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { useWizard } from "@/lib/intake/use-wizard"
import type { FormSchema, SavedData } from "@/lib/intake/schemas"
import { ProgressBar } from "./progress-bar"
import { StepRenderer } from "./step-renderer"
import { StepNav } from "./step-nav"
import { ConflictDialog } from "./conflict-dialog"
import { CompletionChecklist } from "./completion-checklist"
import { CategoryAssignment } from "./category-assignment"
import { CostEstimate } from "./cost-estimate"
import { SettingsPopover } from "./settings-popover"
import { VoiceAssistant } from "./voice-assistant"

interface WizardShellProps {
  schema: FormSchema
  initialData: SavedData | null
  orgId: string
}

export function WizardShell({ schema, initialData, orgId }: WizardShellProps) {
  const wizard = useWizard(schema, initialData, orgId)
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const [voicePanelOpen, setVoicePanelOpen] = useState(false)

  const scrollToFirstError = useCallback(() => {
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

  /* ── Auto-derivation: suggest values for fields based on earlier answers ── */

  const deriveRef = useRef(new Set<string>())

  /* Derive field values from earlier answers. Only fills empty fields, only once per field. */
  useEffect(() => {
    const pubValues = wizard.values["your-publication"] ?? {}
    const name = (pubValues.publication_name as string)?.trim() ?? ""
    const tagline = (pubValues.tagline as string)?.trim() ?? ""
    const topic = (pubValues.topic_label as string)?.trim() ?? ""

    function derive(stepId: string, fieldId: string, value: string) {
      if (!value) return
      const key = `${stepId}.${fieldId}`
      if (deriveRef.current.has(key)) return
      const current = (wizard.values[stepId]?.[fieldId] as string)?.trim()
      if (current) return // user already filled it
      deriveRef.current.add(key)
      wizard.setFieldValue(stepId, fieldId, value)
    }

    // publication_name + tagline → full_title
    if (name && tagline) {
      derive("your-publication", "full_title", `${name} — ${tagline}`)
    }

    // topic_label → community_label, publication_type
    if (topic) {
      const capitalized = topic.replace(/\b\w/g, (c) => c.toUpperCase())
      derive("your-publication", "community_label", `the ${topic} community`)
      derive("your-publication", "publication_type", `${topic} intelligence briefing`)
      derive("sentiment-and-scoring", "tracker_name", `${capitalized} Index`)
    }

    // publication_name → site_url suggestion
    if (name) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20)
      derive("your-publication", "site_url", `https://${slug}.org`)
    }

    // tagline → llms_description
    if (tagline) {
      derive("review-and-launch", "llms_description", tagline)
    }
  }, [wizard.values, wizard.setFieldValue])

  /* Sentiment tracker defaults — pre-fill once when arriving at the step */
  const didPrefillTracker = useRef(false)
  useEffect(() => {
    if (wizard.currentStepDef.id !== "sentiment-and-scoring") {
      didPrefillTracker.current = false
      return
    }
    if (didPrefillTracker.current) return
    didPrefillTracker.current = true

    const trackerValues = wizard.values["sentiment-and-scoring"] ?? {}

    if (!trackerValues["tracker_nav_label"]) {
      wizard.setFieldValue("sentiment-and-scoring", "tracker_nav_label", "Tracker")
    }
    if (!trackerValues["positive_signal_label"]) {
      wizard.setFieldValue("sentiment-and-scoring", "positive_signal_label", "progress")
    }
    if (!trackerValues["negative_signal_label"]) {
      wizard.setFieldValue("sentiment-and-scoring", "negative_signal_label", "risk")
    }
  }, [wizard.currentStepDef.id, wizard.values, wizard.setFieldValue])

  /* ── Category ↔ Editor logic ── */

  const categoryEntries = useMemo(() => {
    const cats = wizard.values["categories-and-editors"]?.["categories"] as Record<string, unknown>[] | undefined
    if (!cats || !Array.isArray(cats)) return []
    return cats.filter((c) => (c.short_label as string)?.trim())
  }, [wizard.values])

  const categoryOptions = useMemo(() => {
    return categoryEntries.map((c, index) => ({
      label: c.short_label as string,
      value: (c.short_label as string).toLowerCase(),
      colorIndex: index,
    }))
  }, [categoryEntries])

  /* Auto-populate editors from categories.
     Triggers on category changes (not step entry) since both are on the same step. */
  const didAutoPopEditors = useRef(false)
  useEffect(() => {
    if (wizard.currentStepDef.id !== "categories-and-editors") {
      didAutoPopEditors.current = false
      return
    }
    const currentEditors = wizard.values["categories-and-editors"]?.["editors"] as Record<string, unknown>[] | undefined
    if (currentEditors && currentEditors.length > 0) {
      didAutoPopEditors.current = true
      return
    }
    if (didAutoPopEditors.current) return
    if (categoryEntries.length === 0) return
    didAutoPopEditors.current = true

    const editors: Record<string, unknown>[] = categoryEntries.map((cat) => ({
      editor_name: `${cat.short_label} Editor`,
      category: (cat.short_label as string).toLowerCase(),
      is_spotlight: false,
      expertise: `You are the ${cat.short_label} Editor — an expert in ${cat.full_name || cat.short_label}. You specialize in:\n\n- [Sub-area 1]\n- [Sub-area 2]\n- [Sub-area 3]\n\nYou notice when [what makes your perspective unique]. You track [key organizations and developments in this area].`,
    }))
    editors.push({
      editor_name: "Spotlight Editor",
      category: "spotlight",
      is_spotlight: true,
      expertise: "You are the Spotlight Editor. Your job is to find the most interesting, surprising, or entertaining content — podcasts worth listening to, videos worth watching, demos worth trying, and stories that make people smile or think differently.\n\nYou look for:\n- Notable podcast episodes and interviews\n- Compelling video content and documentaries\n- Interactive demos, tools, and visualizations\n- Unusual angles, human interest stories, and cultural moments\n\nYou notice when something is genuinely interesting to a curious professional, not just technically relevant.",
    })
    wizard.setFieldValue("categories-and-editors", "editors", editors)
  }, [wizard.currentStepDef.id, categoryEntries, wizard.values, wizard.setFieldValue])

  /* Auto-populate sentiment_rules_by_category structure */
  useEffect(() => {
    if (wizard.currentStepDef.id !== "sentiment-and-scoring") return
    const current = wizard.values["sentiment-and-scoring"]?.["sentiment_rules_by_category"] as Record<string, unknown[]> | undefined
    if (current && Object.keys(current).length > 0) return
    if (categoryEntries.length === 0) return

    const initial: Record<string, unknown[]> = {}
    for (const cat of categoryEntries) {
      const key = (cat.short_label as string).toLowerCase()
      initial[key] = []
    }
    wizard.setFieldValue("sentiment-and-scoring", "sentiment_rules_by_category", initial)
  }, [wizard.currentStepDef.id, categoryEntries, wizard.values, wizard.setFieldValue])

  /* Inject dynamic category options into editor fields */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rendererFields = wizard.currentStepDef.fields as any[]

  if (wizard.currentStepDef.id === "categories-and-editors" && categoryOptions.length > 0) {
    rendererFields = rendererFields.map((field: Record<string, unknown>) => {
      if (field.type !== "repeating" || field.id !== "editors" || !Array.isArray(field.fields)) return field
      return {
        ...field,
        fields: (field.fields as Record<string, unknown>[]).map((subField) => {
          if (subField.id !== "category") return subField
          const spotlightOption = { label: "Spotlight", value: "spotlight", colorIndex: -1 }
          const allOptions = [...categoryOptions, spotlightOption]
          return {
            ...subField,
            type: "select",
            options: allOptions,
            colorMap: {
              ...Object.fromEntries(categoryOptions.map(c => [c.value, c.colorIndex])),
              spotlight: -1,
            },
            help: "Which category does this editor cover? Each category can only be assigned to one editor.",
          }
        }),
      }
    })
  }

  /* Inject categories into sentiment-rules custom field */
  if (wizard.currentStepDef.id === "sentiment-and-scoring" && categoryOptions.length > 0) {
    rendererFields = rendererFields.map((field: Record<string, unknown>) => {
      if (field.id === "sentiment_rules_by_category") {
        return { ...field, customProps: { categories: categoryOptions } }
      }
      return field
    })
  }

  /* Category assignment tracking */
  const { assignedCategories, duplicateCategories } = useMemo(() => {
    const assigned = new Map<string, string>()
    const allAssignments = new Map<string, string[]>()
    const editors = wizard.values["categories-and-editors"]?.["editors"] as Record<string, unknown>[] | undefined
    if (!editors) return { assignedCategories: assigned, duplicateCategories: new Map<string, string[]>() }
    for (const editor of editors) {
      const cat = (editor.category as string)?.trim().toLowerCase()
      const name = (editor.editor_name as string)?.trim()
      if (cat && cat !== "spotlight" && name) {
        assigned.set(cat, name)
        const existing = allAssignments.get(cat) ?? []
        existing.push(name)
        allAssignments.set(cat, existing)
      }
    }
    const dupes = new Map<string, string[]>()
    for (const [cat, names] of allAssignments) {
      if (names.length > 1) dupes.set(cat, names)
    }
    return { assignedCategories: assigned, duplicateCategories: dupes }
  }, [wizard.values])

  const showCategoryAssignment = wizard.currentStepDef.id === "categories-and-editors" && categoryOptions.length > 0

  const stepForRenderer = {
    id: wizard.currentStepDef.id,
    title: wizard.currentStepDef.title,
    description: wizard.currentStepDef.description,
    sections: (wizard.currentStepDef as Record<string, unknown>).sections as import("@/lib/intake/schemas").SectionDef[] | undefined,
    fields: rendererFields,
  }

  const currentValues = wizard.values[wizard.currentStepDef.id] ?? {}

  return (
    <div className={cn("flex min-h-dvh flex-col transition-[margin] duration-300", voicePanelOpen && "sm:ml-[380px]")}>
      {/* Header + progress bar */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <h1 className="text-base font-semibold tracking-tight">Onboarding Form</h1>
            <div className="flex items-center gap-1">
              <VoiceAssistant
                setFieldValue={wizard.setFieldValue}
                goToStep={wizard.goToStep}
                values={wizard.values}
                currentStep={wizard.currentStep}
                steps={schema.steps}
                onPanelToggle={setVoicePanelOpen}
              />
              <SettingsPopover />
            </div>
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

      {/* Main content — single responsive render */}
      <div id="main-content" className="flex-1 flex flex-col">
        <div className="mx-auto w-full flex-1 py-6 md:py-10 max-w-3xl px-5 md:px-4">
          <div
            key={wizard.currentStep}
            className={cn(
              "animate-step-enter",
              /* Desktop: card-like wrapper */
              "md:rounded-xl md:border md:bg-card md:shadow-sm md:px-8 md:py-6"
            )}
          >
            <StepRenderer
              step={stepForRenderer}
              values={currentValues}
              onChange={handleFieldChange}
              errors={wizard.errors}
              skippedSections={wizard.skippedSections}
              onToggleSkip={wizard.toggleSkipSection}
              onFieldBlur={wizard.validateField}
              headingRef={stepHeadingRef}
              headerExtra={showCategoryAssignment ? (
                <CategoryAssignment
                  categories={categoryOptions}
                  assignedCategories={assignedCategories}
                  duplicateCategories={duplicateCategories}
                  hasError={!!wizard.errors["editors"]}
                />
              ) : undefined}
            />
            {wizard.isLastStep && (
              <>
                <CompletionChecklist
                  steps={schema.steps}
                  values={wizard.values}
                  completedSteps={wizard.completedSteps}
                  skippedSections={wizard.skippedSections}
                  onGoToStep={wizard.goToStep}
                />
                <CostEstimate values={wizard.values} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav spacer for mobile fixed nav */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      <StepNav
        canGoPrev={wizard.canGoPrev}
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        onPrev={wizard.prevStep}
        onNext={handleNext}
        onSave={wizard.saveToServer}
        saveStatus={wizard.saveStatus}
        lastSaved={wizard.lastSaved}
      />

      <ConflictDialog
        isOpen={wizard.saveStatus === "conflict"}
        onResolve={wizard.resolveConflict}
        conflictData={wizard.conflictData}
      />

    </div>
  )
}
