import { NextResponse } from "next/server"
import { readFile } from "@/lib/intake/github"
import { logger } from "@/lib/intake/logger"

const PROMPT_PATH = "config/assistant-prompt.md"

/**
 * Tool definitions for the ElevenLabs Conversational AI agent.
 * These are client-side tools — executed in the browser via onToolCall callback.
 */
const AGENT_TOOLS = [
  {
    type: "client" as const,
    name: "update_field",
    description: "Set a single form field value. Use for text, textarea, url, number, and boolean fields.",
    parameters: {
      type: "object" as const,
      properties: {
        step_id: {
          type: "string" as const,
          enum: [
            "your-publication",
            "categories-and-editors",
            "sentiment-and-scoring",
            "sources-and-discovery",
            "review-and-launch",
          ],
          description: "The step the field belongs to",
        },
        field_id: {
          type: "string" as const,
          description: "The field ID to update",
        },
        value: {
          description: "The value to set (string, number, or boolean)",
        },
      },
      required: ["step_id", "field_id", "value"],
    },
  },
  {
    type: "client" as const,
    name: "update_repeating_group",
    description:
      "Set all entries for a repeating group field (categories, editors, sources, social handles, organizations, topics). Replaces the entire array.",
    parameters: {
      type: "object" as const,
      properties: {
        step_id: {
          type: "string" as const,
          description: "The step the field belongs to",
        },
        field_id: {
          type: "string" as const,
          description: "The repeating group field ID",
        },
        entries: {
          type: "array" as const,
          items: { type: "object" as const },
          description: "Array of entry objects",
        },
      },
      required: ["step_id", "field_id", "entries"],
    },
  },
  {
    type: "client" as const,
    name: "get_current_progress",
    description:
      "Check which form fields have been filled and which are still empty. Call this at the start of a conversation and when the user asks about progress.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    type: "client" as const,
    name: "navigate_to_step",
    description: "Navigate the form to a specific step (0=Publication, 1=Categories, 2=Sentiment, 3=Sources, 4=Review).",
    parameters: {
      type: "object" as const,
      properties: {
        step_index: {
          type: "number" as const,
          minimum: 0,
          maximum: 4,
          description: "Step index (0-4)",
        },
      },
      required: ["step_index"],
    },
  },
]

/**
 * POST /api/intake/assistant
 * Creates or updates the ElevenLabs Conversational AI agent with the current
 * system prompt and tool definitions.
 */
export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID

  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured" },
      { status: 500 }
    )
  }

  try {
    /* Load the system prompt from GitHub */
    const promptFile = await readFile(PROMPT_PATH)
    const prompt = promptFile?.content ?? ""

    const agentConfig = {
      conversation_config: {
        agent: {
          prompt: { prompt },
          first_message:
            "Hi! I'm here to help you set up your publication. I'll ask you some questions and fill in the form as we go. Let's start — what's your publication called?",
          language: "en",
        },
        tts: {
          voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel — clear, professional
        },
      },
      platform_settings: {
        tools: AGENT_TOOLS,
      },
      name: "Intake Onboarding Assistant",
    }

    if (agentId) {
      /* Update existing agent */
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
        {
          method: "PATCH",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(agentConfig),
        }
      )

      if (!res.ok) {
        const err = await res.text()
        logger.error("POST /api/intake/assistant", `ElevenLabs update failed: ${err}`)
        return NextResponse.json(
          { error: "Failed to update ElevenLabs agent", details: err },
          { status: 502 }
        )
      }

      return NextResponse.json({ agentId, action: "updated" })
    } else {
      /* Create new agent */
      const res = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(agentConfig),
      })

      if (!res.ok) {
        const err = await res.text()
        logger.error("POST /api/intake/assistant", `ElevenLabs create failed: ${err}`)
        return NextResponse.json(
          { error: "Failed to create ElevenLabs agent", details: err },
          { status: 502 }
        )
      }

      const result = await res.json()
      return NextResponse.json({
        agentId: result.agent_id,
        action: "created",
        note: "Add this agent_id as NEXT_PUBLIC_ELEVENLABS_AGENT_ID in .env.local",
      })
    }
  } catch (err) {
    logger.error("POST /api/intake/assistant", err)
    return NextResponse.json(
      { error: "Failed to manage agent" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/intake/assistant
 * Returns current agent configuration status.
 */
export async function GET() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  const hasApiKey = !!process.env.ELEVENLABS_API_KEY

  return NextResponse.json({
    configured: !!(agentId && hasApiKey),
    agentId: agentId ?? null,
    hasApiKey,
  })
}
