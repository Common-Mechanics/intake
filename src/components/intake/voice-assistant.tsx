"use client"

import { useState, useCallback, useRef } from "react"
import { Mic, Phone, PhoneOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { StepDef } from "@/lib/intake/schemas"

interface VoiceAssistantProps {
  setFieldValue: (stepId: string, fieldId: string, value: unknown) => void
  goToStep: (index: number) => void
  values: Record<string, Record<string, unknown>>
  currentStep: number
  steps: StepDef[]
}

interface TranscriptEntry {
  role: "user" | "assistant"
  text: string
  timestamp: number
}

/** Briefly highlight a form field when the assistant fills it */
function highlightField(fieldId: string) {
  const el = document.getElementById(fieldId)
  if (!el) return
  el.scrollIntoView({ behavior: "smooth", block: "center" })
  el.classList.add("ring-2", "ring-primary", "transition-shadow")
  setTimeout(() => {
    el.classList.remove("ring-2", "ring-primary", "transition-shadow")
  }, 2000)
}

/** Build a progress summary for the get_current_progress tool */
function buildProgressSummary(
  values: Record<string, Record<string, unknown>>,
  steps: StepDef[]
): string {
  const summary: string[] = []
  for (const step of steps) {
    const stepValues = values[step.id] ?? {}
    const filled: string[] = []
    const empty: string[] = []
    for (const field of step.fields) {
      if (field.type === "section") continue
      const val = stepValues[field.id]
      const hasVal = val !== undefined && val !== null && val !== "" &&
        !(Array.isArray(val) && val.length === 0)
      if (hasVal) filled.push(field.id)
      else empty.push(field.id)
    }
    summary.push(
      `${step.title}: ${filled.length}/${filled.length + empty.length} filled` +
      (empty.length > 0 ? ` (missing: ${empty.join(", ")})` : " (complete)")
    )
  }
  return summary.join("\n")
}

export function VoiceAssistant({
  setFieldValue,
  goToStep,
  values,
  currentStep,
  steps,
}: VoiceAssistantProps) {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  if (!agentId) return null

  return <VoiceAssistantInner
    agentId={agentId}
    setFieldValue={setFieldValue}
    goToStep={goToStep}
    values={values}
    currentStep={currentStep}
    steps={steps}
  />
}

/** Inner component — only rendered when agent ID is configured */
function VoiceAssistantInner({
  agentId,
  setFieldValue,
  goToStep,
  values,
  steps,
}: VoiceAssistantProps & { agentId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Keep refs to latest values/steps for tool callbacks
  const valuesRef = useRef(values)
  valuesRef.current = values
  const stepsRef = useRef(steps)
  stepsRef.current = steps

  const conversationRef = useRef<{
    endSession: () => Promise<void>
  } | null>(null)

  const addToTranscript = useCallback((role: "user" | "assistant", text: string) => {
    setTranscript(prev => [...prev, { role, text, timestamp: Date.now() }])
    // Auto-scroll
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }, 50)
  }, [])

  const startConversation = useCallback(async () => {
    setError(null)
    try {
      /* Dynamic import to avoid loading ElevenLabs SDK when voice is disabled.
         We use the client directly for imperative session control. */
      const { Conversation } = await import("@11labs/client")

      const conversation = await Conversation.startSession({
        agentId,
        connectionType: "websocket",
        clientTools: {
          update_field: async (params: Record<string, unknown>) => {
            const stepId = params.step_id as string
            const fieldId = params.field_id as string
            const value = params.value
            setFieldValue(stepId, fieldId, value)
            highlightField(fieldId)
            return "Field updated successfully"
          },
          update_repeating_group: async (params: Record<string, unknown>) => {
            const stepId = params.step_id as string
            const fieldId = params.field_id as string
            const entries = params.entries as unknown[]
            setFieldValue(stepId, fieldId, entries)
            return `Updated ${fieldId} with ${entries.length} entries`
          },
          get_current_progress: async () => {
            return buildProgressSummary(valuesRef.current, stepsRef.current)
          },
          navigate_to_step: async (params: Record<string, unknown>) => {
            const stepIndex = params.step_index as number
            goToStep(stepIndex)
            return `Navigated to step ${stepIndex}`
          },
        },
        onConnect: () => {
          setIsConnected(true)
          setError(null)
        },
        onDisconnect: () => {
          setIsConnected(false)
          setIsSpeaking(false)
          conversationRef.current = null
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          setError(msg)
          setIsConnected(false)
        },
        onMessage: (msg: { source: "user" | "ai"; message: string }) => {
          addToTranscript(msg.source === "user" ? "user" : "assistant", msg.message)
        },
        onModeChange: (mode: { mode: "speaking" | "listening" }) => {
          setIsSpeaking(mode.mode === "speaking")
        },
      })

      conversationRef.current = conversation
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    }
  }, [agentId, setFieldValue, goToStep, addToTranscript])

  const endConversation = useCallback(async () => {
    try {
      await conversationRef.current?.endSession()
    } catch {
      // Ignore cleanup errors
    }
    conversationRef.current = null
    setIsConnected(false)
    setIsSpeaking(false)
  }, [])

  return (
    <>
      {/* Header button — inline in the top nav */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn(
          "h-8 gap-1.5 text-xs",
          isConnected && "text-primary"
        )}
      >
        <Mic aria-hidden="true" className={cn("size-3.5", isConnected && "animate-pulse")} />
        <span className="hidden sm:inline">Assisted Setup</span>
      </Button>

      {/* Voice panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="left"
          className="w-full sm:max-w-md flex flex-col"
          showCloseButton
        >
          <SheetHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base">Voice Assistant</SheetTitle>
              {isConnected && (
                <Badge variant={isSpeaking ? "default" : "secondary"} className="text-xs">
                  {isSpeaking ? "Speaking" : "Listening"}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {/* Transcript */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="flex flex-col gap-3 py-4">
              {transcript.length === 0 && !isConnected && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click the button below to start a voice conversation.
                  The assistant will guide you through the form.
                </p>
              )}
              {transcript.map((entry, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                    entry.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-muted"
                  )}
                >
                  {entry.text}
                </div>
              ))}
              {isConnected && !isSpeaking && transcript.length > 0 && (
                <div className="self-start flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                  Listening...
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Error display */}
          {error && (
            <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="border-t px-4 py-3 flex items-center justify-center gap-3">
            {!isConnected ? (
              <Button
                onClick={startConversation}
                className="gap-2"
                size="lg"
              >
                <Phone aria-hidden="true" className="size-4" />
                Start Conversation
              </Button>
            ) : (
              <Button
                onClick={endConversation}
                variant="destructive"
                className="gap-2"
                size="lg"
              >
                <PhoneOff aria-hidden="true" className="size-4" />
                End Conversation
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
