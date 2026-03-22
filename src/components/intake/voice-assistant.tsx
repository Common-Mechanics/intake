"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Mic, Phone, PhoneOff, Pause, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { StepDef } from "@/lib/intake/schemas"

interface VoiceAssistantProps {
  setFieldValue: (stepId: string, fieldId: string, value: unknown) => void
  goToStep: (index: number) => void
  values: Record<string, Record<string, unknown>>
  currentStep: number
  steps: StepDef[]
  onPanelToggle?: (isOpen: boolean) => void
  /** Whether the panel should be visible */
  isOpen?: boolean
}

interface TranscriptEntry {
  role: "user" | "assistant"
  text: string
  timestamp: number
}

/** Play a short synthesized tone via Web Audio API */
function playTone(type: "connect" | "disconnect") {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.value = 0.15

    if (type === "connect") {
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
  } catch { /* AudioContext not available */ }
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

/**
 * Header trigger button — rendered inline in the nav bar.
 * Separate from the panel so it can live in the header while the panel
 * is a flex sibling at the layout level.
 */
export function VoiceAssistantTrigger({
  isOpen,
  onToggle,
}: {
  isOpen: boolean
  onToggle: () => void
}) {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  if (!agentId) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={cn("h-10 gap-1.5 text-xs touch-manipulation", isOpen && "text-primary")}
    >
      <Mic aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Assisted Setup</span>
    </Button>
  )
}

/**
 * Voice assistant panel — renders as a flex sibling to the form column.
 * Takes up space in the layout (not an overlay).
 */
export function VoiceAssistant({
  setFieldValue,
  goToStep,
  values,
  currentStep,
  steps,
  onPanelToggle,
  isOpen,
}: VoiceAssistantProps) {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  if (!agentId) return null
  if (!isOpen) return null

  return <VoiceAssistantPanel
    agentId={agentId}
    setFieldValue={setFieldValue}
    goToStep={goToStep}
    values={values}
    currentStep={currentStep}
    steps={steps}
    onPanelToggle={onPanelToggle}
  />
}

function VoiceAssistantPanel({
  agentId,
  setFieldValue,
  goToStep,
  values,
  steps,
  onPanelToggle,
}: VoiceAssistantProps & { agentId: string }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

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
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }, 50)
  }, [])

  const startConversation = useCallback(async () => {
    setError(null)
    try {
      const { Conversation } = await import("@11labs/client")

      const conversation = await Conversation.startSession({
        agentId,
        connectionType: "websocket",
        clientTools: {
          update_field: async (params: Record<string, unknown>) => {
            setFieldValue(params.step_id as string, params.field_id as string, params.value)
            highlightField(params.field_id as string)
            return "Field updated successfully"
          },
          update_repeating_group: async (params: Record<string, unknown>) => {
            const entries = params.entries as unknown[]
            setFieldValue(params.step_id as string, params.field_id as string, entries)
            return `Updated with ${entries.length} entries`
          },
          get_current_progress: async () => {
            return buildProgressSummary(valuesRef.current, stepsRef.current)
          },
          navigate_to_step: async (params: Record<string, unknown>) => {
            goToStep(params.step_index as number)
            return `Navigated to step ${params.step_index}`
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
          setError(err instanceof Error ? err.message : String(err))
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

      /* Immediately send current form state so the agent knows what's
         already filled and doesn't re-ask completed questions */
      const progress = buildProgressSummary(valuesRef.current, stepsRef.current)
      conversation.sendContextualUpdate(
        `[SYSTEM] Current form state — do NOT ask about fields that are already filled. Skip to the first empty required field.\n\n${progress}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [agentId, setFieldValue, goToStep, addToTranscript])

  const endConversation = useCallback(async () => {
    try { await conversationRef.current?.endSession() } catch { /* ignore */ }
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
    conversationRef.current.sendContextualUpdate(
      next
        ? "[SYSTEM] The user has paused the conversation to work on the form manually. Do NOT speak, do NOT ask questions, do NOT respond until the user resumes. Stay completely silent."
        : "[SYSTEM] The user has resumed the conversation. Continue where you left off — ask the next question."
    )
    setIsMuted(next)
  }, [isMuted])

  /* Keep the agent aware of manual form edits during an active conversation.
     Debounced to avoid spamming on every keystroke. */
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isConnected || !conversationRef.current) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => {
      const progress = buildProgressSummary(valuesRef.current, stepsRef.current)
      conversationRef.current?.sendContextualUpdate(
        `[SYSTEM] Updated form state — skip fields that are already filled:\n\n${progress}`
      )
    }, 3000)
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current) }
  }, [values, isConnected])

  return (
    <div className={cn(
      /* Mobile: bottom sheet */
      "fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-2xl shadow-2xl flex flex-col",
      "max-h-[70dvh]",
      /* Desktop: side panel */
      "sm:static sm:inset-auto sm:z-auto sm:w-[380px] sm:shrink-0 sm:border-r sm:border-t-0 sm:rounded-none sm:shadow-none sm:h-dvh sm:sticky sm:top-0 sm:max-h-none"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Voice Assistant</span>
          {isConnected && (
            <Badge variant={isMuted ? "outline" : isSpeaking ? "default" : "secondary"} className="text-xs">
              {isMuted ? "Paused" : isSpeaking ? "Speaking" : "Listening"}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={() => onPanelToggle?.(false)} aria-label="Close">
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {/* Transcript */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4" ref={scrollRef}>
        <div className="flex flex-col gap-3 py-4">
          {transcript.length === 0 && !isConnected && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Start a voice conversation. The assistant will guide you through the form.
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
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="border-t px-4 py-3 flex items-center justify-center gap-3 shrink-0">
        {!isConnected ? (
          <Button onClick={startConversation} className="gap-2" size="lg">
            <Phone aria-hidden="true" className="size-4" />
            Start Conversation
          </Button>
        ) : (
          <>
            <Button onClick={toggleMute} variant="outline" className="gap-2" size="lg">
              {isMuted ? (
                <><Play aria-hidden="true" className="size-4" /> Resume</>
              ) : (
                <><Pause aria-hidden="true" className="size-4" /> Pause</>
              )}
            </Button>
            <Button onClick={endConversation} variant="destructive" className="gap-2" size="lg">
              <PhoneOff aria-hidden="true" className="size-4" /> End
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
