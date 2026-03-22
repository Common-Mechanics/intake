"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CostEstimateProps {
  values: Record<string, Record<string, unknown>>
}

/**
 * Pipeline cost model based on actual ai-dossier architecture.
 *
 * Pricing per million tokens (March 2026):
 * - Haiku 4.5:  $0.80 input / $4.00 output
 * - Sonnet 4.6: $3.00 input / $15.00 output (cache read: $0.30)
 * - Opus 4.6:   $15.00 input / $75.00 output
 */

interface PipelineStep {
  task: string
  model: string
  daily: number
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

    const steps: PipelineStep[] = [
      {
        task: "Triage",
        model: "Haiku 4.5",
        daily: 0.05 + sourceCount * 0.015,
        note: `Flag relevant items from ${sourceCount} source${sourceCount !== 1 ? "s" : ""}`,
      },
      {
        task: "Novelty classification",
        model: "Sonnet 4.6",
        daily: 0.35,
        note: "Classify flagged stories into novelty classes",
      },
      {
        task: "Event matching",
        model: "Sonnet + embeddings",
        daily: 0.15,
        note: "Match to persistent event timeline",
      },
      {
        task: `Editor review (\u00d7${editorCount})`,
        model: "Sonnet 4.6",
        daily: editorCount * 0.30,
        note: `Parallel domain reviews (prompt cached)`,
      },
      {
        task: "Chief editor",
        model: "Opus 4.6",
        daily: 0.80,
        note: "Final selection of leads, ticker, spotlight",
      },
      {
        task: "Research + produce",
        model: "Sonnet 4.6",
        daily: 0.60,
        note: "Deep research and final dossier copy",
      },
      {
        task: "Dedup QA",
        model: "Haiku + embeddings",
        daily: 0.05,
        note: "Semantic duplicate removal",
      },
    ]

    if (ruleCount > 0) {
      steps.push({
        task: `Sentiment rules (\u00d7${ruleCount})`,
        model: "Sonnet 4.6",
        daily: 0.15,
        note: "Custom domain-specific scoring",
      })
    }

    const totalDaily = steps.reduce((sum, s) => sum + s.daily, 0)

    return { steps, totalDaily }
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

          {/* Expandable breakdown */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
          >
            <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", !showDetails && "-rotate-90")} />
            Pipeline breakdown
          </button>

          {showDetails && (
            <>
              {/* ── Desktop: 3-column table ── */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Step</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Daily</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Monthly</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {estimate.steps.map((step) => (
                    <tr key={step.task}>
                      <td className="py-2 pr-4">
                        <span className="font-medium">{step.task}</span>
                        <span className="text-muted-foreground text-xs ml-1.5">({step.model})</span>
                        {step.note && (
                          <p className="text-xs text-muted-foreground mt-0.5">{step.note}</p>
                        )}
                      </td>
                      <td className="py-2 tabular-nums text-right whitespace-nowrap">{fmt(step.daily)}</td>
                      <td className="py-2 tabular-nums text-right whitespace-nowrap">{fmt(step.daily * 30)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td className="pt-3 font-semibold">Total</td>
                    <td className="pt-3 font-semibold tabular-nums text-right">{fmt(estimate.totalDaily)}</td>
                    <td className="pt-3 font-semibold tabular-nums text-right">~{fmt(estimate.totalDaily * 30)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* ── Mobile: 2 stacked tables (daily + monthly) ── */}
              <div className="md:hidden flex flex-col gap-4">
                {/* Daily costs */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Step</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Daily</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {estimate.steps.map((step) => (
                      <tr key={step.task}>
                        <td className="py-2 pr-3">
                          <span className="font-medium">{step.task}</span>
                          <p className="text-xs text-muted-foreground">{step.model}</p>
                        </td>
                        <td className="py-2 tabular-nums text-right whitespace-nowrap align-top">{fmt(step.daily)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td className="pt-3 font-semibold">Total daily</td>
                      <td className="pt-3 font-semibold tabular-nums text-right">{fmt(estimate.totalDaily)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Monthly costs */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Step</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Monthly</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {estimate.steps.map((step) => (
                      <tr key={step.task}>
                        <td className="py-1.5 pr-3 text-muted-foreground">{step.task}</td>
                        <td className="py-1.5 tabular-nums text-right whitespace-nowrap">{fmt(step.daily * 30)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td className="pt-3 font-semibold">Total monthly</td>
                      <td className="pt-3 font-semibold tabular-nums text-right">~{fmt(estimate.totalDaily * 30)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {/* Summary when collapsed */}
          {!showDetails && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Estimated daily</span>
                <span className="font-semibold tabular-nums">{fmt(estimate.totalDaily)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Estimated monthly</span>
                <span className="font-semibold tabular-nums">~{fmt(estimate.totalDaily * 30)}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Claude API pricing (March 2026). Editor reviews use prompt caching for ~90% input savings.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
