"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { toast } from "sonner"
import type { FormSchema, SavedData, StepDef } from "./schemas"
import { validateStep } from "./schema-to-zod"
import { logger } from "./logger"

type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict"

const LOCAL_DEBOUNCE_MS = 500
const SERVER_DEBOUNCE_MS = 2000 // debounce GitHub saves to avoid API rate limits

function safeLocalStorage() {
  try {
    // Test that localStorage is actually available (fails in SSR / privacy mode)
    const testKey = "__intake_test__"
    localStorage.setItem(testKey, "1")
    localStorage.removeItem(testKey)
    return localStorage
  } catch {
    return null
  }
}

function loadDraft(orgId: string): Record<string, Record<string, unknown>> | null {
  const store = safeLocalStorage()
  if (!store) return null
  try {
    const raw = store.getItem(`intake-draft-${orgId}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveDraft(orgId: string, values: Record<string, Record<string, unknown>>) {
  const store = safeLocalStorage()
  if (!store) return
  try {
    store.setItem(`intake-draft-${orgId}`, JSON.stringify(values))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/**
 * Merges local draft data with server data. Server wins for any key present in both.
 */
function mergeData(
  local: Record<string, Record<string, unknown>> | null,
  server: Record<string, unknown> | null,
  steps: StepDef[]
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {}

  // Start with empty step buckets
  for (const step of steps) {
    result[step.id] = {}
  }

  // Layer in local draft
  if (local) {
    for (const [stepId, stepData] of Object.entries(local)) {
      if (result[stepId]) {
        result[stepId] = { ...result[stepId], ...stepData }
      }
    }
  }

  // Layer in server data (wins on conflicts). Server data is flat — map fields to steps.
  if (server) {
    for (const step of steps) {
      for (const field of step.fields) {
        if (field.id in server) {
          result[step.id][field.id] = server[field.id]
        }
      }
    }
  }

  return result
}

/**
 * Flattens step-keyed values into a single record for saving to server.
 */
function flattenValues(values: Record<string, Record<string, unknown>>): Record<string, unknown> {
  const flat: Record<string, unknown> = {}
  for (const stepData of Object.values(values)) {
    Object.assign(flat, stepData)
  }
  return flat
}

export function useWizard(
  schema: FormSchema,
  initialData: SavedData | null,
  orgId: string
) {
  const steps = schema.steps
  const totalSteps = steps.length

  // --- State ---

  /* Initialize step from URL ?step= param if present */
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window === "undefined") return 0
    const params = new URLSearchParams(window.location.search)
    const stepParam = params.get("step")
    if (stepParam) {
      const idx = steps.findIndex((s) => s.id === stepParam)
      if (idx >= 0) return idx
      const num = parseInt(stepParam, 10)
      if (!isNaN(num) && num >= 1 && num <= steps.length) return num - 1
    }
    return 0
  })

  const [values, setValues] = useState<Record<string, Record<string, unknown>>>(() => {
    const draft = loadDraft(orgId)
    return mergeData(draft, initialData?.data ?? null, steps)
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  /* Track which fields the user has actually typed in — blur validation
     only fires on dirty fields so empty untouched fields don't show errors */
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set())

  const [skippedSections, setSkippedSections] = useState<Set<string>>(() => {
    return new Set(initialData?.skippedSections ?? [])
  })

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    return new Set(initialData?.completedSteps ?? [])
  })

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [lastSaved, setLastSaved] = useState<Date | null>(
    initialData?.lastSaved ? new Date(initialData.lastSaved) : null
  )
  const [sha, setSha] = useState<string | undefined>(initialData?.sha)
  const [conflictData, setConflictData] = useState<SavedData | null>(null)
  // Whether localStorage has a draft (gives users confidence their typing isn't lost)
  const [hasDraft, setHasDraft] = useState<boolean>(() => loadDraft(orgId) !== null)

  // Debounce timer refs
  const localDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const serverDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Derived ---

  const currentStepDef = steps[currentStep]
  const canGoPrev = currentStep > 0
  const canGoNext = currentStep < totalSteps - 1
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1

  const progressPercent = useMemo(() => {
    if (totalSteps === 0) return 0
    return Math.round((completedSteps.size / totalSteps) * 100)
  }, [completedSteps.size, totalSteps])

  // --- Auto-save: localStorage (fast) + GitHub (debounced) ---

  /* localStorage — crash recovery, 500ms debounce */
  useEffect(() => {
    if (localDebounceRef.current) clearTimeout(localDebounceRef.current)
    localDebounceRef.current = setTimeout(() => {
      saveDraft(orgId, values)
      setHasDraft(true)
    }, LOCAL_DEBOUNCE_MS)
    return () => {
      if (localDebounceRef.current) clearTimeout(localDebounceRef.current)
    }
  }, [values, orgId])

  /* We need a ref to the latest saveToServer to avoid stale closures in the
     debounced effect. The actual saveToServer function is defined below. */
  const saveToServerRef = useRef<() => Promise<void>>(undefined)

  /* GitHub — primary persistence, 2s debounce */
  useEffect(() => {
    if (serverDebounceRef.current) clearTimeout(serverDebounceRef.current)
    serverDebounceRef.current = setTimeout(() => {
      saveToServerRef.current?.()
    }, SERVER_DEBOUNCE_MS)
    return () => {
      if (serverDebounceRef.current) clearTimeout(serverDebounceRef.current)
    }
    // Only re-trigger when values, skippedSections, or completedSteps change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, skippedSections, completedSteps])

  // --- Validation ---

  /**
   * Collects all data across steps for condition evaluation.
   */
  const getAllData = useCallback((): Record<string, unknown> => {
    return flattenValues(values)
  }, [values])

  const validateCurrentStep = useCallback((): boolean => {
    const stepDef = steps[currentStep]
    if (skippedSections.has(stepDef.id)) return true

    const stepData = values[stepDef.id] ?? {}
    const allData = getAllData()
    const result = validateStep(stepDef.fields, stepData, allData)

    if (result) {
      setErrors(result)
      return false
    }

    setErrors({})
    return true
  }, [currentStep, steps, values, skippedSections, getAllData])

  const validateField = useCallback(
    (fieldId: string): string | undefined => {
      const stepDef = steps[currentStep]
      if (skippedSections.has(stepDef.id)) return undefined

      /* Only validate on blur if user has actually typed in this field */
      if (!dirtyFields.has(fieldId)) return undefined

      const field = stepDef.fields.find((f) => f.id === fieldId)
      if (!field) return undefined

      const stepData = values[stepDef.id] ?? {}
      const allData = getAllData()
      const result = validateStep([field], { [fieldId]: stepData[fieldId] }, allData)

      if (result && result[fieldId]) {
        setErrors((prev) => ({ ...prev, [fieldId]: result[fieldId] }))
        return result[fieldId]
      }

      // Clear error for this field if now valid
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
      return undefined
    },
    [currentStep, steps, values, skippedSections, dirtyFields, getAllData]
  )

  // --- Navigation ---

  /* Update URL query param to reflect current step */
  const syncStepToUrl = useCallback(
    (index: number) => {
      if (typeof window === "undefined") return
      const stepId = steps[index]?.id
      if (!stepId) return
      const url = new URL(window.location.href)
      url.searchParams.set("step", stepId)
      window.history.replaceState({}, "", url.toString())
    },
    [steps]
  )

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSteps) return
      setErrors({})
      setCurrentStep(index)
      syncStepToUrl(index)
    },
    [totalSteps, syncStepToUrl]
  )

  const nextStep = useCallback((): boolean => {
    if (isLastStep) return false
    const valid = validateCurrentStep()
    if (!valid) return false

    // Mark current step as completed
    const stepId = steps[currentStep].id
    setCompletedSteps((prev) => { const next = new Set(prev); next.add(stepId); return next })
    const newStep = currentStep + 1
    setCurrentStep(newStep)
    syncStepToUrl(newStep)
    setErrors({})
    return true
  }, [isLastStep, validateCurrentStep, currentStep, steps, syncStepToUrl])

  const prevStep = useCallback(() => {
    if (!canGoPrev) return
    setErrors({})
    const newStep = currentStep - 1
    setCurrentStep(newStep)
    syncStepToUrl(newStep)
  }, [canGoPrev, currentStep, syncStepToUrl])

  // --- Data ---

  const setFieldValue = useCallback(
    (stepId: string, fieldId: string, value: unknown) => {
      setDirtyFields((prev) => { const next = new Set(prev); next.add(fieldId); return next })
      setValues((prev) => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          [fieldId]: value,
        },
      }))
      /* Clear errors for this field and any sub-field errors (e.g. categories.0.name) */
      setErrors((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${fieldId}.`)) delete next[key]
        }
        return next
      })
    },
    []
  )

  const toggleSkipSection = useCallback(
    (stepId: string) => {
      setSkippedSections((prev) => {
        const next = new Set(prev)
        if (next.has(stepId)) {
          next.delete(stepId)
        } else {
          next.add(stepId)
          // Skipped sections count as completed for progress
          setCompletedSteps((cp) => { const n = new Set(cp); n.add(stepId); return n })
        }
        return next
      })
      // Clear errors when toggling skip
      setErrors({})
    },
    []
  )

  // --- Save to server ---

  /**
   * Save to GitHub. `quiet` mode suppresses toasts (used by auto-save).
   * Explicit saves (Save & Complete) use loud mode.
   */
  const saveToServer = useCallback(async (options?: { quiet?: boolean }) => {
    const quiet = options?.quiet ?? false

    /* Don't stack saves — skip if already saving */
    if (saveStatus === "saving") return

    setSaveStatus("saving")

    const payload: SavedData = {
      schemaId: schema.id,
      schemaVersion: schema.version,
      orgId,
      orgName: (values["publication-identity"]?.publication_name as string) ?? orgId,
      data: flattenValues(values),
      skippedSections: Array.from(skippedSections),
      completedSteps: Array.from(completedSteps),
      lastSaved: new Date().toISOString(),
      ...(sha && { sha }),
    }

    try {
      const response = await fetch(`/api/intake/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.status === 409) {
        const conflict = await response.json()
        setConflictData(conflict.serverData ?? null)
        setSaveStatus("conflict")
        toast.error("Someone else saved changes. Please resolve the conflict.")
        return
      }

      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`)
      }

      const result = await response.json()
      if (result.sha) setSha(result.sha)

      setSaveStatus("saved")
      setLastSaved(new Date())
      if (!quiet) toast.success("Progress saved.")
    } catch (err) {
      logger.error("useWizard.saveToServer", err, { orgId })
      setSaveStatus("error")
      if (!quiet) toast.error("Failed to save. Please try again.")
    }
  }, [schema, orgId, values, skippedSections, completedSteps, sha, saveStatus])

  /* Keep the ref in sync so the debounced auto-save uses the latest closure */
  saveToServerRef.current = () => saveToServer({ quiet: true })

  // --- Conflict resolution ---

  const resolveConflict = useCallback(
    (choice: "mine" | "theirs") => {
      if (choice === "theirs" && conflictData) {
        // Replace local values with server data
        const serverValues = mergeData(null, conflictData.data, steps)
        setValues(serverValues)
        setSkippedSections(new Set(conflictData.skippedSections))
        setCompletedSteps(new Set(conflictData.completedSteps))
        setSha(conflictData.sha)
        toast.info("Loaded server version.")
      } else {
        // Keep local — clear the SHA so next save overwrites
        setSha(conflictData?.sha)
        toast.info("Keeping your version. Save again to overwrite.")
      }
      setConflictData(null)
      setSaveStatus("idle")
    },
    [conflictData, steps]
  )

  return {
    // Current state
    currentStep,
    currentStepDef,
    totalSteps,
    values,
    errors,
    skippedSections,
    completedSteps,

    // Navigation
    goToStep,
    nextStep,
    prevStep,
    canGoNext,
    canGoPrev,
    isFirstStep,
    isLastStep,

    // Data
    setFieldValue,
    toggleSkipSection,

    // Validation
    validateCurrentStep,
    validateField,

    // Save
    saveStatus,
    lastSaved,
    saveToServer,
    conflictData,
    resolveConflict,

    // Progress
    progressPercent,

    // Draft
  }
}
