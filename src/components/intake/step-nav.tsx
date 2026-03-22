"use client"

import { ChevronLeft, ChevronRight, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SaveIndicator } from "./save-indicator"

type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict"

interface StepNavProps {
  canGoPrev: boolean
  canGoNext: boolean
  isFirstStep: boolean
  isLastStep: boolean
  onPrev: () => void
  onNext: () => void
  onSave: () => void
  saveStatus: SaveStatus
  lastSaved: Date | null
}

export function StepNav({
  canGoPrev,
  isFirstStep,
  isLastStep,
  onPrev,
  onNext,
  onSave,
  saveStatus,
  lastSaved,
}: StepNavProps) {
  return (
    <div
      className={cn(
        /* Mobile: fixed to bottom with safe-area padding */
        "fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm",
        "pb-[env(safe-area-inset-bottom)]",
        /* Desktop: sticky instead of fixed */
        "md:sticky md:bottom-0 md:z-auto"
      )}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        {/* Back button — hidden on first step to avoid a disabled-looking control */}
        {!isFirstStep ? (
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={!canGoPrev}
            className="min-h-[48px] min-w-[48px] gap-1.5"
          >
            <ChevronLeft className="size-4" data-icon="inline-start" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        ) : (
          <div className="min-w-[48px]" />
        )}

        {/* Center: save indicator */}
        <div className="flex-1 flex justify-center">
          <SaveIndicator status={saveStatus} lastSaved={lastSaved} />
        </div>

        {/* Next / Save & Complete button */}
        {isLastStep ? (
          <Button
            onClick={onSave}
            className="min-h-[48px] gap-1.5 font-semibold"
          >
            <Save className="size-4" data-icon="inline-start" />
            <span>Save & Complete</span>
          </Button>
        ) : (
          <Button
            onClick={onNext}
            className="min-h-[48px] min-w-[48px] gap-1.5"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" data-icon="inline-end" />
          </Button>
        )}
      </div>
    </div>
  )
}
