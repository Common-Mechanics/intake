"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Mic, Phone, PhoneOff, Pause, Play, X, GripHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { StepDef } from "@/lib/intake/schemas"

/* ── Types ── */

interface TranscriptEntry {
  role: "user" | "assistant"
  text: string
  timestamp: number
}

interface ConversationHandle {
  endSession: () => Promise<void>
  setMicMuted: (muted: boolean) => void
  setVolume: (opts: { volume: number }) => void
  sendContextualUpdate: (text: string) => void
}

interface VoiceState {
  isConnected: boolean
  isSpeaking: boolean
  isMuted: boolean
  transcript: TranscriptEntry[]
  error: string | null
}

interface VoiceAssistantProps {
  setFieldValue: (stepId: string, fieldId: string, value: unknown) => void
  goToStep: (index: number) => void
  values: Record<string, Record<string, unknown>>
  currentStep: number
  steps: StepDef[]
  errors: Record<string, string>
  onValidateAllSteps?: () => Record<string, Record<string, string>>
  onSaveAndComplete?: () => void
  onPanelToggle?: (isOpen: boolean) => void
  onConnectionChange?: (isConnected: boolean) => void
  onPausedChange?: (isPaused: boolean) => void
  isOpen?: boolean
}

/* ── Helpers ── */

function playTone(type: "connect" | "disconnect") {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.value = 0.15
    if (type === "connect") {
      const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 660; o1.connect(gain); o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.1)
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 880; o2.connect(gain); o2.start(ctx.currentTime + 0.12); o2.stop(ctx.currentTime + 0.22)
      setTimeout(() => ctx.close(), 300)
    } else {
      const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 440; o1.connect(gain); o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.12)
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 294; o2.connect(gain); o2.start(ctx.currentTime + 0.15); o2.stop(ctx.currentTime + 0.3)
      setTimeout(() => ctx.close(), 400)
    }
  } catch { /* noop */ }
}

function highlightField(fieldId: string) {
  const el = document.getElementById(fieldId)
  if (!el) return
  el.scrollIntoView({ behavior: "smooth", block: "center" })
  el.classList.add("ring-2", "ring-primary", "transition-shadow")
  setTimeout(() => el.classList.remove("ring-2", "ring-primary", "transition-shadow"), 2000)
}

function buildProgressSummary(
  values: Record<string, Record<string, unknown>>,
  steps: StepDef[],
  errors?: Record<string, string>,
  currentStepIndex?: number
): string {
  const summary: string[] = []
  if (currentStepIndex !== undefined) {
    summary.push(`User is currently viewing: Step ${currentStepIndex + 1} "${steps[currentStepIndex]?.title}". ALWAYS call navigate_to_step to match the step you are discussing.`)
    summary.push("")
  }
  for (const step of steps) {
    const sv = values[step.id] ?? {}
    const filled: string[] = [], empty: string[] = []
    for (const f of step.fields) {
      if (f.type === "section") continue
      const v = sv[f.id]
      const has = v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
      if (has) filled.push(f.id); else empty.push(f.id)
    }
    let line = `${step.title}: ${filled.length}/${filled.length + empty.length} filled`
    if (empty.length > 0) line += ` (missing: ${empty.join(", ")})`
    else line += " (complete)"
    summary.push(line)
  }

  /* Append any active validation errors */
  if (errors && Object.keys(errors).length > 0) {
    summary.push("\nValidation errors:")
    for (const [fieldId, msg] of Object.entries(errors)) {
      summary.push(`  - ${fieldId}: ${msg}`)
    }
  }

  return summary.join("\n")
}

/* ── Header trigger button ── */

export function VoiceAssistantTrigger({
  isOpen,
  isConnected,
  isPaused,
  onToggle,
}: {
  isOpen: boolean
  isConnected: boolean
  isPaused: boolean
  onToggle: () => void
}) {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  if (!agentId) return null

  const active = isConnected || isPaused

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={cn(
        "h-10 gap-1.5 text-xs touch-manipulation",
        isConnected && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900",
        isPaused && "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900",
        isOpen && !active && "text-primary"
      )}
    >
      {isConnected ? (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
        </span>
      ) : isPaused ? (
        <span className="inline-flex size-2 rounded-full bg-amber-500" />
      ) : (
        <Mic aria-hidden="true" className="size-4" />
      )}
      <span className="hidden sm:inline">
        {isConnected ? "Call Active" : isPaused ? "Call Paused" : "Assisted Setup"}
      </span>
    </Button>
  )
}

/* ── Main panel component ── */

export function VoiceAssistant({
  setFieldValue,
  goToStep,
  values,
  currentStep,
  steps,
  errors,
  onValidateAllSteps,
  onSaveAndComplete,
  onPanelToggle,
  onConnectionChange,
  onPausedChange,
  isOpen,
}: VoiceAssistantProps) {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID

  /* All conversation state lives HERE (persists when panel closes) */
  const [voice, setVoice] = useState<VoiceState>({
    isConnected: false, isSpeaking: false, isMuted: false,
    transcript: [], error: null,
  })
  const [isStarting, setIsStarting] = useState(false)
  const conversationRef = useRef<ConversationHandle | null>(null)
  const valuesRef = useRef(values); valuesRef.current = values
  const stepsRef = useRef(steps); stepsRef.current = steps
  const errorsRef = useRef(errors); errorsRef.current = errors
  const currentStepRef = useRef(currentStep); currentStepRef.current = currentStep
  const validateAllRef = useRef(onValidateAllSteps); validateAllRef.current = onValidateAllSteps
  const saveRef = useRef(onSaveAndComplete); saveRef.current = onSaveAndComplete
  const scrollRef = useRef<HTMLDivElement>(null)

  /* Notify parent of connection/pause state changes */
  useEffect(() => {
    onConnectionChange?.(voice.isConnected)
  }, [voice.isConnected, onConnectionChange])

  useEffect(() => {
    onPausedChange?.(voice.isMuted)
  }, [voice.isMuted, onPausedChange])

  /* Auto-scroll transcript */
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [voice.transcript.length])

  const addToTranscript = useCallback((role: "user" | "assistant", text: string) => {
    setVoice(prev => ({ ...prev, transcript: [...prev.transcript, { role, text, timestamp: Date.now() }] }))
  }, [])

  const isStartingRef = useRef(false)
  const startConversation = useCallback(async () => {
    if (!agentId || isStartingRef.current || conversationRef.current) return
    isStartingRef.current = true
    setIsStarting(true)
    setVoice(prev => ({ ...prev, error: null }))
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
            setFieldValue(params.step_id as string, params.field_id as string, params.entries as unknown[])
            return "Updated"
          },
          get_current_progress: async () => buildProgressSummary(valuesRef.current, stepsRef.current, errorsRef.current, currentStepRef.current),
          navigate_to_step: async (params: Record<string, unknown>) => {
            goToStep(params.step_index as number)
            return "Navigated"
          },
          validate_all_steps: async () => {
            const allErrors = validateAllRef.current?.()
            if (!allErrors || Object.keys(allErrors).length === 0) return "All steps valid — ready to finish!"
            const summary: string[] = []
            for (const [stepId, stepErrors] of Object.entries(allErrors)) {
              summary.push(`${stepId}:`)
              for (const [field, msg] of Object.entries(stepErrors)) {
                summary.push(`  - ${field}: ${msg}`)
              }
            }
            return `Validation errors found:\n${summary.join("\n")}`
          },
          complete_form: async () => {
            saveRef.current?.()
            return "Form saved and completed!"
          },
        },
        onConnect: () => {
          setVoice(prev => ({ ...prev, isConnected: true, error: null }))
          playTone("connect")
        },
        onDisconnect: () => {
          setVoice(prev => ({ ...prev, isConnected: false, isSpeaking: false, isMuted: false }))
          conversationRef.current = null
          playTone("disconnect")
        },
        onError: (err: unknown) => {
          setVoice(prev => ({ ...prev, error: err instanceof Error ? err.message : String(err), isConnected: false }))
        },
        onMessage: (msg: { source: "user" | "ai"; message: string }) => {
          addToTranscript(msg.source === "user" ? "user" : "assistant", msg.message)
        },
        onModeChange: (mode: { mode: "speaking" | "listening" }) => {
          setVoice(prev => ({ ...prev, isSpeaking: mode.mode === "speaking" }))
        },
      })
      conversationRef.current = conversation
      isStartingRef.current = false
      setIsStarting(false)
      const progress = buildProgressSummary(valuesRef.current, stepsRef.current, errorsRef.current, currentStepRef.current)
      conversation.sendContextualUpdate(`[SYSTEM] Current form state — skip filled fields. Fix any errors:\n\n${progress}`)
    } catch (err) {
      isStartingRef.current = false
      setIsStarting(false)
      setVoice(prev => ({ ...prev, error: err instanceof Error ? err.message : String(err) }))
    }
  }, [agentId, setFieldValue, goToStep, addToTranscript])

  const endConversation = useCallback(async () => {
    try { await conversationRef.current?.endSession() } catch { /* ignore */ }
    conversationRef.current = null
    setVoice(prev => ({ ...prev, isConnected: false, isSpeaking: false, isMuted: false }))
  }, [])

  /* Pause: fully end the session (only way to stop ElevenLabs turn timeouts).
     Resume: start a new session with transcript context so it picks up where it left off. */
  const togglePause = useCallback(async () => {
    if (voice.isMuted) {
      /* Resume — start a new session with conversation history */
      setVoice(prev => ({ ...prev, isMuted: false }))
      await startConversation()
      /* Send transcript summary so the agent knows what was discussed */
      setTimeout(() => {
        if (!conversationRef.current) return
        const recentMessages = voice.transcript.slice(-10).map(
          e => `${e.role === "user" ? "User" : "Assistant"}: ${e.text}`
        ).join("\n")
        conversationRef.current.sendContextualUpdate(
          `[SYSTEM] This is a resumed conversation. Here's what was discussed before the pause:\n\n${recentMessages}\n\nContinue where you left off — ask the next question.`
        )
      }, 500)
    } else {
      /* Pause — fully end the session */
      try { await conversationRef.current?.endSession() } catch { /* ignore */ }
      conversationRef.current = null
      isStartingRef.current = false
      setVoice(prev => ({ ...prev, isMuted: true, isConnected: false, isSpeaking: false }))
    }
  }, [voice.isMuted, voice.transcript, startConversation])

  /* Sync form edits to agent (debounced) */
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!voice.isConnected || !conversationRef.current) return
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      conversationRef.current?.sendContextualUpdate(
        `[SYSTEM] Updated form state:\n\n${buildProgressSummary(valuesRef.current, stepsRef.current, errorsRef.current, currentStepRef.current)}`
      )
    }, 3000)
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current) }
  }, [values, voice.isConnected])

  /* ── Mobile bottom sheet drag ── */
  const [sheetHeight, setSheetHeight] = useState(75) // percentage of viewport
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const onDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    dragRef.current = { startY: clientY, startHeight: sheetHeight }
  }, [sheetHeight])

  const onDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!dragRef.current) return
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    const deltaY = clientY - dragRef.current.startY
    const deltaPercent = (deltaY / window.innerHeight) * 100
    const newHeight = Math.max(20, Math.min(90, dragRef.current.startHeight - deltaPercent))
    setSheetHeight(newHeight)
  }, [])

  const onDragEnd = useCallback(() => {
    if (!dragRef.current) return
    /* If dragged below 30%, close the panel */
    if (sheetHeight < 30) {
      onPanelToggle?.(false)
      setSheetHeight(75)
    }
    dragRef.current = null
  }, [sheetHeight, onPanelToggle])

  if (!agentId) return null
  if (!isOpen) return null

  return (
    <div
      className={cn(
        /* Mobile: bottom sheet */
        "fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-2xl shadow-2xl flex flex-col",
        /* Desktop: side panel, full viewport height */
        "sm:static sm:inset-auto sm:z-auto sm:w-[380px] sm:shrink-0 sm:border-r sm:border-t-0 sm:rounded-none sm:shadow-none sm:sticky sm:top-0 sm:!h-dvh"
      )}
      style={{ "--voice-sheet-h": `${sheetHeight}dvh`, height: "var(--voice-sheet-h)" } as React.CSSProperties}
    >
      {/* Drag handle — mobile only */}
      <div
        className="sm:hidden flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
      >
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Voice Assistant</span>
          {voice.isConnected && (
            <Badge variant={voice.isMuted ? "outline" : voice.isSpeaking ? "default" : "secondary"} className="text-xs">
              {voice.isMuted ? "Paused" : voice.isSpeaking ? "Speaking" : "Listening"}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => onPanelToggle?.(false)} aria-label="Close panel">
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {/* Transcript */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4" ref={scrollRef}>
        <div className="flex flex-col gap-3 py-4">
          {voice.transcript.length === 0 && !voice.isConnected && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Start a voice conversation. The assistant will guide you through the form.
            </p>
          )}
          {voice.transcript.length === 0 && voice.isConnected && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Connected — the assistant will start speaking shortly.
            </p>
          )}
          {voice.transcript.map((entry, i) => (
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
          {voice.isConnected && !voice.isSpeaking && !voice.isMuted && voice.transcript.length > 0 && (
            <div className="self-start flex items-center gap-1.5 text-xs text-muted-foreground px-1">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              Listening...
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {voice.error && (
        <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {voice.error}
        </div>
      )}

      {/* Controls — 3 states: idle, active, paused */}
      <div className="border-t px-4 py-2.5 flex items-center justify-center gap-3 shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {voice.isMuted && !voice.isConnected ? (
          /* Paused state — session ended, can resume or fully end */
          <>
            <Button onClick={togglePause} className="gap-2" size="lg" disabled={isStarting}>
              <Play aria-hidden="true" className="size-4" /> {isStarting ? "Resuming\u2026" : "Resume"}
            </Button>
            <Button onClick={() => { setVoice(prev => ({ ...prev, isMuted: false })); }} variant="outline" className="gap-2" size="lg">
              <PhoneOff aria-hidden="true" className="size-4" /> End
            </Button>
          </>
        ) : voice.isConnected ? (
          /* Active state */
          <>
            <Button onClick={togglePause} variant="outline" className="gap-2" size="lg">
              <Pause aria-hidden="true" className="size-4" /> Pause
            </Button>
            <Button onClick={endConversation} variant="destructive" className="gap-2" size="lg">
              <PhoneOff aria-hidden="true" className="size-4" /> End
            </Button>
          </>
        ) : (
          /* Idle state */
          <Button onClick={startConversation} className="gap-2" size="lg" disabled={isStarting}>
            <Phone aria-hidden="true" className="size-4" />
            {isStarting ? "Connecting\u2026" : "Start Conversation"}
          </Button>
        )}
      </div>
    </div>
  )
}
