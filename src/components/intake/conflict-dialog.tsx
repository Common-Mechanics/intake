"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { SavedData } from "@/lib/intake/schemas"

interface ConflictDialogProps {
  isOpen: boolean
  onResolve: (choice: "mine" | "theirs") => void
  conflictData: SavedData | null
}

export function ConflictDialog({
  isOpen,
  onResolve,
  conflictData,
}: ConflictDialogProps) {
  // Format server version timestamp so users can make an informed decision
  const serverTimestamp = conflictData?.lastSaved
    ? new Date(conflictData.lastSaved).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <Dialog open={isOpen}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Someone else made changes</DialogTitle>
          <DialogDescription>
            Another user has saved changes to this form since you last loaded it.
            {serverTimestamp && (
              <> Their version was saved on {serverTimestamp}.</>
            )}
            {" "}Choose which version you&apos;d like to keep.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve("theirs")}>
            Use their changes
          </Button>
          <Button onClick={() => onResolve("mine")}>
            Keep my changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
