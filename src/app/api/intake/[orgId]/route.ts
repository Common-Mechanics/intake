import { NextRequest, NextResponse } from "next/server"
import { savedDataSchema } from "@/lib/intake/schemas"
import {
  readIntakeData,
  writeIntakeData,
  readOrgIndex,
  writeOrgIndex,
  ConflictError,
} from "@/lib/intake/github"
import { logger } from "@/lib/intake/logger"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params

  try {
    const data = await readIntakeData(orgId)
    if (!data) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(data)
  } catch (err) {
    logger.error("GET /api/intake/[orgId]", err, { orgId })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params

  try {
    const body = await request.json()
    const parsed = savedDataSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const inputData = parsed.data

    // Write intake data with optimistic locking
    const saved = await writeIntakeData(orgId, inputData)

    // Update org index entry
    try {
      const index = await readOrgIndex()
      const entryIdx = index.findIndex((e) => e.id === orgId)
      if (entryIdx !== -1) {
        const entry = index[entryIdx]
        /* Load the schema to get the actual step count and IDs.
           completedSteps from the client may contain old step IDs,
           so we only count IDs that match current schema steps. */
        let schemaStepCount = 5 // fallback
        let schemaStepIds: string[] = []
        try {
          const schema = await import("@/data/ai-dossier-intake.json")
          schemaStepCount = schema.default.steps.length
          schemaStepIds = schema.default.steps.map((s: { id: string }) => s.id)
        } catch { /* use fallback */ }

        /* Only count completedSteps that match current schema step IDs */
        const validCompleted = inputData.completedSteps.filter(
          (id: string) => schemaStepIds.length === 0 || schemaStepIds.includes(id)
        )
        const completedCount = validCompleted.length

        let status: "not_started" | "in_progress" | "completed" =
          "not_started"
        if (completedCount > 0 && completedCount < schemaStepCount) {
          status = "in_progress"
        } else if (completedCount >= schemaStepCount) {
          status = "completed"
        }

        index[entryIdx] = {
          ...entry,
          lastModified: new Date().toISOString(),
          status,
          completedSteps: completedCount,
          totalSteps: schemaStepCount,
        }
        await writeOrgIndex(index)
      }
    } catch (indexErr) {
      // Non-fatal: log but don't fail the request
      logger.warn("PUT /api/intake/[orgId]", "Failed to update org index", {
        orgId,
        error: indexErr instanceof Error ? indexErr.message : String(indexErr),
      })
    }

    return NextResponse.json(saved)
  } catch (err) {
    if (err instanceof ConflictError) {
      // Return 409 with current server data so the client can merge
      const currentData = await readIntakeData(orgId)
      return NextResponse.json(
        {
          error: "Conflict: data was modified by another request",
          currentData,
        },
        { status: 409 }
      )
    }

    logger.error("PUT /api/intake/[orgId]", err, { orgId })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
