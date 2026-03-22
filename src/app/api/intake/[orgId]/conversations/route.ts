import { NextResponse } from "next/server"
import { readFile, writeFile } from "@/lib/intake/github"
import { logger } from "@/lib/intake/logger"

const CONVERSATIONS_PATH = (orgId: string) => `clients/${orgId}/conversations.json`

interface ConversationEntry {
  id: string
  startedAt: string
  endedAt: string
  messages: { role: "user" | "assistant"; text: string; timestamp: number }[]
}

/**
 * GET /api/intake/[orgId]/conversations
 * Returns all saved conversation logs for an org.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  try {
    const file = await readFile(CONVERSATIONS_PATH(orgId))
    if (!file) return NextResponse.json({ conversations: [], sha: null })
    const conversations = JSON.parse(file.content) as ConversationEntry[]
    return NextResponse.json({ conversations, sha: file.sha })
  } catch (err) {
    logger.error("GET /api/intake/[orgId]/conversations", err)
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 })
  }
}

/**
 * POST /api/intake/[orgId]/conversations
 * Appends a conversation log entry.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params
  try {
    const body = await request.json()
    const entry = body as ConversationEntry

    if (!entry.messages || !Array.isArray(entry.messages)) {
      return NextResponse.json({ error: "Invalid conversation data" }, { status: 400 })
    }

    /* Read-modify-write with retry on conflict (handles concurrent saves) */
    let attempts = 0
    while (attempts < 3) {
      attempts++
      const file = await readFile(CONVERSATIONS_PATH(orgId))
      let conversations: ConversationEntry[] = []
      let sha: string | undefined

      if (file) {
        conversations = JSON.parse(file.content)
        sha = file.sha
      }

      conversations.push(entry)

      try {
        const result = await writeFile(
          CONVERSATIONS_PATH(orgId),
          JSON.stringify(conversations, null, 2),
          `Log conversation ${entry.id} for ${orgId}`,
          sha
        )
        return NextResponse.json({ saved: true, sha: result.sha, total: conversations.length })
      } catch (writeErr) {
        /* SHA conflict — another write happened. Retry with fresh read. */
        if (attempts < 3) continue
        throw writeErr
      }
    }
  } catch (err) {
    logger.error("POST /api/intake/[orgId]/conversations", err)
    return NextResponse.json({ error: "Failed to save conversation" }, { status: 500 })
  }
}
