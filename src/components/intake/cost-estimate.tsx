"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface CostEstimateProps {
  values: Record<string, Record<string, unknown>>
}

/**
 * Pipeline cost model based on actual ai-dossier architecture.
 *
 * Each pipeline run processes ~30-80 stories through 7 phases:
 * 1. Triage (Haiku) — flag relevant items from RSS batches
 * 2. Novelty Classification (Sonnet) — classify each flagged item
 * 3. Event Matching (Sonnet + embeddings) — match to persistent timeline
 * 4. Editor Review (Sonnet × N editors) — parallel domain reviews
 * 5. Chief Editor (Opus) — final selection of leads/ticker/spotlight
 * 6. Research + Produce (Sonnet) — write the final dossier
 * 7. Dedup QA (Haiku + embeddings) — remove semantic duplicates
 *
 * Pricing per million tokens (March 2026):
 * - Haiku 4.5:  $0.80 input / $4.00 output
 * - Sonnet 4.6: $3.00 input / $15.00 output (cache read: $0.30)
 * - Opus 4.6:   $15.00 input / $75.00 output
 */

interface PipelineStep {
  task: string
  model: string
  /** Estimated daily cost in USD — varies by editor/source count */
  cost: number
  note?: string
}

export function CostEstimate({ values }: CostEstimateProps) {
  const [showDetails, setShowDetails] = useState(false)

  const estimate = useMemo(() => {
    const editors = values["categories-and-editors"]?.["editors"] as Record<string, unknown>[] | undefined
    const sources = values["sources-and-discovery"]?.["sources"] as Record<string, unknown>[] | undefined
    const sentimentRules = values["sentiment-and-scoring"]?.["sentiment_rules_by_category"] as Record<string, unknown> | undefined

    const editorCount = editors?.length ?? 0
    const sourceCount = sources?.length ?? 0
    const ruleCount = sentimentRules
      ? Object.values(sentimentRules).reduce((sum: number, rules) => sum + (Array.isArray(rules) ? rules.length : 0), 0)
      : 0

    /* Per-step cost estimates based on actual pipeline token usage.
       Assumes ~40 stories flagged from triage, 15 make final dossier. */
    const steps: PipelineStep[] = [
      {
        task: "Triage",
        model: "Haiku 4.5",
        cost: 0.05 + sourceCount * 0.015,
        note: `Batch-flag relevant items from ${sourceCount} source${sourceCount !== 1 ? "s" : ""}`,
      },
      {
        task: "Novelty classification",
        model: "Sonnet 4.6",
        cost: 0.35,
        note: "Classify each flagged story into 1 of 9 novelty classes",
      },
      {
        task: "Event matching",
        model: "Sonnet 4.6 + embeddings",
        cost: 0.15,
        note: "Match stories to persistent event timeline",
      },
      {
        task: `Editor review (×${editorCount})`,
        model: "Sonnet 4.6",
        cost: editorCount * 0.30,
        note: `${editorCount} editor${editorCount !== 1 ? "s" : ""} review all stories in parallel (cached)`,
      },
      {
        task: "Chief editor",
        model: "Opus 4.6",
        cost: 0.80,
        note: "Final selection of 3 leads, 8\u201312 ticker, 1\u20132 spotlight",
      },
      {
        task: "Research + produce",
        model: "Sonnet 4.6",
        cost: 0.60,
        note: "Deep research on leads, write final dossier copy",
      },
      {
        task: "Dedup QA",
        model: "Haiku 4.5 + embeddings",
        cost: 0.05,
        note: "Semantic duplicate detection and removal",
      },
    ]

    if (ruleCount > 0) {
      steps.push({
        task: `Sentiment rules (${ruleCount})`,
        model: "Sonnet 4.6",
        cost: 0.15,
        note: `${ruleCount} custom rule${ruleCount !== 1 ? "s" : ""} for domain-specific scoring`,
      })
    }

    const dailyCost = steps.reduce((sum, s) => sum + s.cost, 0)
    const monthlyCost = dailyCost * 30

    return { steps, dailyCost, monthlyCost, editorCount, sourceCount }
  }, [values])

  const fmt = (n: number) => `$${n.toFixed(2)}`

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Estimated Pipeline Costs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Based on your current setup. Actual costs depend on daily story volume.
          </p>

          {/* Summary totals */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estimated daily</span>
            <span className="text-base font-semibold tabular-nums">{fmt(estimate.dailyCost)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estimated monthly</span>
            <span className="text-base font-semibold tabular-nums">~{fmt(estimate.monthlyCost)}</span>
          </div>

          <Separator />

          {/* Expandable per-step breakdown */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
          >
            <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", !showDetails && "-rotate-90")} />
            Pipeline breakdown
          </button>

          {showDetails && (
            <div className="flex flex-col divide-y divide-border/50">
              {estimate.steps.map((step) => (
                <div key={step.task} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{step.task}</span>
                    <span className="text-muted-foreground ml-1.5 text-xs">({step.model})</span>
                    {step.note && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.note}</p>
                    )}
                  </div>
                  <span className="tabular-nums text-muted-foreground shrink-0">{fmt(step.cost)}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            Based on Claude API pricing (March 2026). Editor reviews use prompt caching for ~90% input savings.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
