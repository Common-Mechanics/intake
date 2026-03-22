"use client"

import { useState, useCallback, useRef } from "react"
import { Mic, MicOff, Phone, PhoneOff, Pause, Play } from "lucide-react"
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

/** Play a short synthesized tone via Web Audio API — no audio files needed */
function playTone(type: "connect" | "disconnect") {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.value = 0.15

    if (type === "connect") {
      /* Friendly rising ping: two quick ascending notes */
      const o1 = ctx.createOscillator()
      o1.type = "sine"
      o1.frequency.value = 660
      o1.connect(gain)
      o1.start(ctx.currentTime)
      o1.stop(ctx.currentTime + 0.1)

      const o2 = ctx.createOscillator()
      o2.type = "sine"
      o2.frequency.value = 880
      o2.connect(gain)
      o2.start(ctx.currentTime + 0.12)
      o2.stop(ctx.currentTime + 0.22)

      setTimeout(() => ctx.close(), 300)
    } else {
      /* Deeper descending ba-dum: two notes going down */
      const o1 = ctx.createOscillator()
      o1.type = "sine"
      o1.frequency.value = 440
      o1.connect(gain)
      o1.start(ctx.currentTime)
      o1.stop(ctx.currentTime + 0.12)

      const o2 = ctx.createOscillator()
      o2.type = "sine"
      o2.frequency.value = 294
      o2.connect(gain)
      o2.start(ctx.currentTime + 0.15)
      o2.stop(ctx.currentTime + 0.3)

      setTimeout(() => ctx.close(), 400)
    }
  } catch {
    /* AudioContext not available — silently skip */
  }
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
  const [isMuted, setIsMuted] = useState(false)
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
    setMicMuted: (muted: boolean) => void
    setVolume: (opts: { volume: number }) => void
    sendContextualUpdate: (text: string) => void
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
          playTone("connect")
        },
        onDisconnect: () => {
          setIsConnected(false)
          setIsSpeaking(false)
          conversationRef.current = null
          playTone("disconnect")
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
    setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    if (!conversationRef.current) return
    const next = !isMuted
    conversationRef.current.setMicMuted(next)
    conversationRef.current.setVolume({ volume: next ? 0 : 1 })
    /* Tell the agent to stop/resume — prevents timeout re-prompts */
    conversationRef.current.sendContextualUpdate(
      next
        ? "[SYSTEM] The user has paused the conversation to work on the form manually. Do NOT speak, do NOT ask questions, do NOT respond until the user resumes. Stay completely silent."
        : "[SYSTEM] The user has resumed the conversation. Continue where you left off — ask the next question."
    )
    setIsMuted(next)
  }, [isMuted])

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
          className="w-full sm:max-w-md flex flex-col overflow-hidden"
          showCloseButton
        >
          <SheetHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base">Voice Assistant</SheetTitle>
              {isConnected && (
                <Badge variant={isMuted ? "outline" : isSpeaking ? "default" : "secondary"} className="text-xs">
                  {isMuted ? "Paused" : isSpeaking ? "Speaking" : "Listening"}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {/* Transcript — min-h-0 allows flex-1 to shrink and scroll */}
          <ScrollArea className="flex-1 min-h-0 px-4" ref={scrollRef}>
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
              {isConnected && !isSpeaking && !isMuted && transcript.length > 0 && (
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
              <>
                <Button
                  onClick={toggleMute}
                  variant="outline"
                  className="gap-2"
                  size="lg"
                >
                  {isMuted ? (
                    <>
                      <Play aria-hidden="true" className="size-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause aria-hidden="true" className="size-4" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  onClick={endConversation}
                  variant="destructive"
                  className="gap-2"
                  size="lg"
                >
                  <PhoneOff aria-hidden="true" className="size-4" />
                  End
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
