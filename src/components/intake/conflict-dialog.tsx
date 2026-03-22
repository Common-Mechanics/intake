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
}: ConflictDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Someone else made changes</DialogTitle>
          <DialogDescription>
            Another user has saved changes to this form since you last loaded it.
            Choose which version you&apos;d like to keep.
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
