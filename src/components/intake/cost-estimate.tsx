"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface CostEstimateProps {
  values: Record<string, Record<string, unknown>>
}

/**
 * Estimates daily/monthly pipeline costs based on the configuration.
 *
 * Cost drivers:
 * - Editors: each editor reviews every story (~$0.30-0.50/editor/day)
 * - Sources: more sources = more stories to process (~$0.02/source/day)
 * - Sentiment rules: minimal cost impact
 * - Base pipeline overhead: ~$1.50/day
 */
export function CostEstimate({ values }: CostEstimateProps) {
  const estimate = useMemo(() => {
    const editors = values["categories-and-editors"]?.["editors"] as Record<string, unknown>[] | undefined
    const sources = values["sources-and-discovery"]?.["sources"] as Record<string, unknown>[] | undefined
    const sentimentRules = values["sentiment-and-scoring"]?.["sentiment_rules_by_category"] as Record<string, unknown> | undefined

    const editorCount = editors?.length ?? 0
    const sourceCount = sources?.length ?? 0
    const hasRules = sentimentRules ? Object.values(sentimentRules).some((rules) => Array.isArray(rules) && rules.length > 0) : false

    /* Cost model (approximate, based on Claude API pricing) */
    const baseCost = 1.50 // daily base pipeline overhead
    const perEditorCost = 0.40 // each editor reviews all stories
    const perSourceCost = 0.02 // fetching + initial triage per source
    const rulesCost = hasRules ? 0.20 : 0 // sentiment rule processing

    const dailyCost = baseCost + (editorCount * perEditorCost) + (sourceCount * perSourceCost) + rulesCost
    const monthlyCost = dailyCost * 30

    return {
      editorCount,
      sourceCount,
      dailyCost,
      monthlyCost,
      breakdown: [
        { label: "Base pipeline", daily: baseCost },
        { label: `${editorCount} editor${editorCount !== 1 ? "s" : ""} reviewing stories`, daily: editorCount * perEditorCost },
        { label: `${sourceCount} source${sourceCount !== 1 ? "s" : ""} monitored`, daily: sourceCount * perSourceCost },
        ...(hasRules ? [{ label: "Custom sentiment rules", daily: rulesCost }] : []),
      ],
    }
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
            Based on your current setup. Actual costs depend on story volume and content length.
          </p>

          <div className="flex flex-col gap-1.5">
            {estimate.breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="tabular-nums">{fmt(item.daily)}/day</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estimated daily</span>
            <span className="text-base font-semibold tabular-nums">{fmt(estimate.dailyCost)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estimated monthly</span>
            <span className="text-base font-semibold tabular-nums">~{fmt(estimate.monthlyCost)}</span>
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Costs are approximate and based on current Claude API pricing.
            Actual costs may vary based on daily story volume, content length, and API rate changes.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
