"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertTriangle, Cloud } from "lucide-react"

type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict"

interface SaveIndicatorProps {
  status: SaveStatus
  lastSaved: Date | null
}

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
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000)
    return () => clearInterval(interval)
  }, [])

  if (status === "saving") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        <span>Saving...</span>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertTriangle className="size-3" />
        <span>Save failed — retrying</span>
      </div>
    )
  }

  if (status === "conflict") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <AlertTriangle className="size-3" />
        <span>Conflict detected</span>
      </div>
    )
  }

  if (lastSaved) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Cloud className="size-3" />
        <span>Saved {relativeTime(lastSaved)}</span>
      </div>
    )
  }

  return null
}
