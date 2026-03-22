"use client"

import { Badge } from "@/components/ui/badge"
import { Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { CategoryDot } from "@/lib/intake/category-colors"

interface CategoryAssignmentProps {
  categories: { label: string; value: string; colorIndex: number }[]
  assignedCategories: Map<string, string>
  /** Categories assigned to more than one editor — value → editor names[] */
  duplicateCategories?: Map<string, string[]>
  /** Show error styling when there are unassigned categories and user tried to proceed */
  hasError?: boolean
}

export function CategoryAssignment({
  categories,
  assignedCategories,
  duplicateCategories = new Map(),
  hasError = false,
}: CategoryAssignmentProps) {
  const unassignedCount = categories.length - assignedCategories.size
  const allAssigned = unassignedCount === 0
  const hasDuplicates = duplicateCategories.size > 0

  return (
    <div className={cn(
      "flex flex-col gap-2 rounded-lg border p-3",
      hasDuplicates
        ? "bg-destructive/5 border-destructive/30"
        : allAssigned
          ? "bg-muted/30 border-border"
          : hasError
            ? "bg-destructive/5 border-destructive/30"
            : "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
    )}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {(!allAssigned || hasDuplicates) && (
            <AlertCircle className={cn(
              "size-3.5 shrink-0",
              hasDuplicates || hasError ? "text-destructive" : "text-amber-600 dark:text-amber-400"
            )} />
          )}
          <p className={cn(
            "text-xs font-medium",
            allAssigned && !hasDuplicates
              ? "text-muted-foreground"
              : hasDuplicates || hasError
                ? "text-destructive"
                : "text-amber-700 dark:text-amber-300"
          )}>
            {hasDuplicates
              ? "Some categories are assigned to multiple editors"
              : allAssigned
                ? "All categories assigned"
                : `${unassignedCount} ${unassignedCount === 1 ? "category" : "categories"} still ${unassignedCount === 1 ? "needs" : "need"} an editor`}
          </p>
        </div>
        {hasDuplicates && (
          <p className="text-xs text-destructive/80 ml-5">
            Each category should only be covered by one editor
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat, catIdx) => {
          const assignedTo = assignedCategories.get(cat.value)
          const isAssigned = !!assignedTo
          const isDuplicate = duplicateCategories.has(cat.value)
          const dupeEditors = duplicateCategories.get(cat.value)

          return (
            <Badge
              key={`${cat.value}-${catIdx}`}
              variant={isAssigned ? "default" : "outline"}
              className={cn(
                "text-xs transition-colors",
                isDuplicate
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : isAssigned
                    ? "bg-primary/10 text-primary border-primary/20"
                    : hasError
                      ? "border-destructive/40 text-destructive bg-destructive/5"
                      : "border-dashed border-amber-400 text-amber-700 dark:border-amber-600 dark:text-amber-300"
              )}
            >
              {isAssigned && !isDuplicate && <Check className="size-3 mr-1" />}
              {isDuplicate && <AlertCircle className="size-3 mr-1" />}
              <CategoryDot index={cat.colorIndex} />
              {cat.label}
              {isDuplicate && dupeEditors && (
                <span className="ml-1 font-normal">
                  → {dupeEditors.join(", ")}
                </span>
              )}
              {isAssigned && !isDuplicate && (
                <span className="ml-1 text-muted-foreground font-normal">
                  → {assignedTo}
                </span>
              )}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
