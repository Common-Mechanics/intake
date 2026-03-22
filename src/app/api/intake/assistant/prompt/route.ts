import { NextResponse } from "next/server"
import { readFile, writeFile } from "@/lib/intake/github"
import { logger } from "@/lib/intake/logger"

const PROMPT_PATH = "config/assistant-prompt.md"

/**
 * GET /api/intake/assistant/prompt
 * Reads the system prompt from GitHub.
 */
export async function GET() {
  try {
    const file = await readFile(PROMPT_PATH)
    if (!file) {
      return NextResponse.json(
        { content: "", sha: null },
        { status: 200 }
      )
    }
    return NextResponse.json({ content: file.content, sha: file.sha })
  } catch (err) {
    logger.error("GET /api/intake/assistant/prompt", err)
    return NextResponse.json(
      { error: "Failed to read prompt" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/intake/assistant/prompt
 * Writes updated system prompt to GitHub, then optionally syncs to ElevenLabs.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { content, sha } = body as { content: string; sha?: string }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Missing content" },
        { status: 400 }
      )
    }

    const result = await writeFile(
      PROMPT_PATH,
      content,
      "Update voice assistant prompt",
      sha
    )

    /* Sync prompt to ElevenLabs agent if configured */
    const apiKey = process.env.ELEVENLABS_API_KEY
    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
    let synced = false

    if (apiKey && agentId) {
      try {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
          {
            method: "PATCH",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              conversation_config: {
                agent: {
                  prompt: { prompt: content },
                },
              },
            }),
          }
        )
        synced = res.ok
        if (!res.ok) {
          logger.warn("PUT /api/intake/assistant/prompt", "ElevenLabs sync failed", {
            status: res.status,
          })
        }
      } catch (syncErr) {
        logger.warn("PUT /api/intake/assistant/prompt", "ElevenLabs sync error", {
          error: syncErr instanceof Error ? syncErr.message : String(syncErr),
        })
      }
    }

    return NextResponse.json({
      sha: result.sha,
      synced,
      syncedAt: synced ? new Date().toISOString() : null,
    })
  } catch (err) {
    logger.error("PUT /api/intake/assistant/prompt", err)
    return NextResponse.json(
      { error: "Failed to save prompt" },
      { status: 500 }
    )
  }
}
