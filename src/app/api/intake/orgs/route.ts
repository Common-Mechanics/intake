import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  readOrgIndex,
  writeOrgIndex,
  writeFile,
  readFile,
  deleteFile,
} from "@/lib/intake/github"
import type { OrgEntry, SavedData } from "@/lib/intake/schemas"
import { logger } from "@/lib/intake/logger"

export async function GET() {
  try {
    const orgs = await readOrgIndex()
    return NextResponse.json(orgs)
  } catch (err) {
    logger.error("GET /api/intake/orgs", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

const createOrgSchema = z.object({
  name: z.string().min(1),
  prefix: z.string().min(1),
  schemaId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createOrgSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { name, prefix, schemaId } = parsed.data

    // Generate orgId: {prefix}-{random 8 digits}
    const randomDigits = String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0")
    const orgId = `${prefix}-${randomDigits}`

    const now = new Date().toISOString()

    // Create initial empty intake.json
    const initialData: Omit<SavedData, "sha"> = {
      schemaId,
      schemaVersion: 1,
      orgId,
      orgName: name,
      data: {},
      skippedSections: [],
      completedSteps: [],
      lastSaved: now,
    }

    await writeFile(
      `clients/${orgId}/intake.json`,
      JSON.stringify(initialData, null, 2),
      `Create intake for ${name} (${orgId})`
    )

    // Add to org index
    const index = await readOrgIndex()
    const newEntry: OrgEntry = {
      id: orgId,
      name,
      schemaId,
      createdAt: now,
      lastModified: now,
      status: "not_started",
      completedSteps: 0,
      // totalSteps will be set once the schema is loaded; default to 0
      totalSteps: 0,
    }
    index.push(newEntry)
    await writeOrgIndex(index)

    return NextResponse.json(newEntry, { status: 201 })
  } catch (err) {
    logger.error("POST /api/intake/orgs", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/intake/orgs?id=orgId&confirm=orgName
 * Deletes an organization's intake data and removes it from the index.
 */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  const confirm = request.nextUrl.searchParams.get("confirm")

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
  }

  try {
    const index = await readOrgIndex()
    const org = index.find((e) => e.id === id)

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    /* Safety check: confirm parameter must match the org name */
    if (confirm !== org.name) {
      return NextResponse.json(
        { error: "Confirmation name does not match. Pass ?confirm=OrgName" },
        { status: 400 }
      )
    }

    /* Delete the intake data file */
    const intakePath = `clients/${id}/intake.json`
    const intakeFile = await readFile(intakePath)
    if (intakeFile) {
      await deleteFile(intakePath, `Delete org ${id}`, intakeFile.sha)
    }

    /* Remove from index */
    const updatedIndex = index.filter((e) => e.id !== id)
    await writeOrgIndex(updatedIndex)

    return NextResponse.json({ deleted: id })
  } catch (err) {
    logger.error("DELETE /api/intake/orgs", err)
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    )
  }
}
