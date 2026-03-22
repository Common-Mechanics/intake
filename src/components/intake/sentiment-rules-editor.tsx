"use client"

import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { CategoryDot } from "@/lib/intake/category-colors"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SentimentRule {
  when_this_happens: string
  default_sentiment: string
  because: string
}

interface CategoryOption {
  label: string
  value: string
  colorIndex: number
}

interface SentimentRulesEditorProps {
  categories: CategoryOption[]
  value: Record<string, SentimentRule[]>
  onChange: (value: Record<string, SentimentRule[]>) => void
  disabled?: boolean
}

const SENTIMENT_OPTIONS = [
  {
    value: "positive",
    label: "Positive",
    selectedClass: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  },
  {
    value: "negative",
    label: "Negative",
    selectedClass: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  },
  {
    value: "neutral",
    label: "Neutral",
    selectedClass: "bg-muted text-muted-foreground border-border",
  },
] as const

export function SentimentRulesEditor({
  categories,
  value,
  onChange,
  disabled,
}: SentimentRulesEditorProps) {
  const updateRule = useCallback(
    (categoryValue: string, ruleIndex: number, field: keyof SentimentRule, fieldValue: string) => {
      const rules = [...(value[categoryValue] ?? [])]
      rules[ruleIndex] = { ...rules[ruleIndex], [field]: fieldValue }
      onChange({ ...value, [categoryValue]: rules })
    },
    [value, onChange]
  )

  const addRule = useCallback(
    (categoryValue: string) => {
      const rules = [...(value[categoryValue] ?? [])]
      rules.push({ when_this_happens: "", default_sentiment: "", because: "" })
      onChange({ ...value, [categoryValue]: rules })
    },
    [value, onChange]
  )

  const removeRule = useCallback(
    (categoryValue: string, ruleIndex: number) => {
      const rules = [...(value[categoryValue] ?? [])]
      rules.splice(ruleIndex, 1)
      onChange({ ...value, [categoryValue]: rules })
    },
    [value, onChange]
  )

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Define your categories first (step 3), then come back to add sentiment rules.
      </p>
    )
  }

  return (
    <div className="space-y-0">
      {categories.map((category, catIdx) => {
        const rules = value[category.value] ?? []
        const isLast = catIdx === categories.length - 1

        return (
          <div
            key={category.value}
            className={cn("py-5", !isLast && "border-b border-border")}
          >
            {/* Category header */}
            <div className="flex items-center gap-2 mb-3">
              <CategoryDot index={category.colorIndex} />
              <h4 className="text-sm font-semibold">{category.label}</h4>
              <span className="text-xs text-muted-foreground">
                {rules.length === 0 ? "no rules" : `${rules.length} rule${rules.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            {/* Rules */}
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-3 pl-[18px]">
                No rules yet — the pipeline will use general sentiment analysis for this category
              </p>
            ) : (
              <div className="space-y-3 mb-3">
                {rules.map((rule, ruleIdx) => (
                  <div
                    key={ruleIdx}
                    className="pl-[18px] grid grid-cols-1 md:grid-cols-[1fr,auto] gap-2 items-start"
                  >
                    {/* Left: "When" textarea */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">When</label>
                      <Textarea
                        value={rule.when_this_happens}
                        onChange={(e) => updateRule(category.value, ruleIdx, "when_this_happens", e.target.value)}
                        placeholder="Describe the situation..."
                        rows={2}
                        disabled={disabled}
                        className="min-h-0 text-sm resize-none"
                      />
                    </div>

                    {/* Right: sentiment pills + because + remove */}
                    <div className="flex flex-col gap-2 md:w-[220px]">
                      {/* Sentiment pill selector */}
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Sentiment</label>
                        <div className="flex gap-1">
                          {SENTIMENT_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={disabled}
                              onClick={() => updateRule(category.value, ruleIdx, "default_sentiment", opt.value)}
                              className={cn(
                                "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                                rule.default_sentiment === opt.value
                                  ? opt.selectedClass
                                  : "border-border text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Because input + remove button */}
                      <div className="flex gap-1.5 items-end">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Because (optional)</label>
                          <Input
                            value={rule.because}
                            onChange={(e) => updateRule(category.value, ruleIdx, "because", e.target.value)}
                            placeholder="governance strengthened..."
                            disabled={disabled}
                            className="text-sm h-8"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeRule(category.value, ruleIdx)}
                          disabled={disabled}
                          className="shrink-0 text-muted-foreground hover:text-destructive mb-0.5"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add rule button */}
            <div className="pl-[18px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addRule(category.value)}
                disabled={disabled}
                className="text-muted-foreground"
              >
                <Plus className="size-3.5" />
                Add rule
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Aim for 3-6 rules. Focus on non-obvious cases.
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
