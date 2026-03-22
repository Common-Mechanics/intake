"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict"

interface SaveIndicatorProps {
  status: SaveStatus
  lastSaved: Date | null
}

/**
 * Formats a Date as relative time ("just now", "2 min ago", etc.).
 */
function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export function SaveIndicator({ status, lastSaved }: SaveIndicatorProps) {
  // Re-render every 30s so relative time stays fresh
  const [, setTick] = useState(0)
  // Track whether "Saved" should be visible (fades after 3s)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (status === "saved") {
      setShowSaved(true)
      const timeout = setTimeout(() => setShowSaved(false), 3000)
      return () => clearTimeout(timeout)
    }
  }, [status])

  if (status === "saving") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        <span>Saving...</span>
      </div>
    )
  }

  if (status === "saved" && showSaved) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in duration-200">
        <Check className="size-3" />
        <span>Saved</span>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertTriangle className="size-3" />
        <span>Save failed</span>
      </div>
    )
  }

  if (status === "conflict") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <AlertTriangle className="size-3" />
        <span>Conflict</span>
      </div>
    )
  }

  // Idle — show last saved time if available
  if (lastSaved) {
    return (
      <span className="text-xs text-muted-foreground">
        Saved {relativeTime(lastSaved)}
      </span>
    )
  }

  return null
}
