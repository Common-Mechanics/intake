# Intake

JSON-driven onboarding wizard with voice assistant and GitHub backend. Built for Common Mechanics client onboarding.

Clients receive a unique link, fill in a 5-step wizard (or talk to a voice assistant), and the data saves to GitHub as JSON files. An admin view at `/admin` lets you create organizations, track completion, edit the voice assistant prompt, and download data.

---

## Quick Start

```bash
npm install
npm run dev
```

### Environment Variables

Create `.env.local`:

```env
GITHUB_TOKEN=ghp_...                          # PAT with contents:write scope
GITHUB_REPO=owner/repo                        # Repository for storing client data
GITHUB_BRANCH=main                            # Optional, defaults to "main"

# Voice assistant (optional — omit to disable)
ELEVENLABS_API_KEY=sk_...                     # Server-side, for agent management
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_...     # Client-side, for WebSocket connection
```

### Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser                                                         │
│                                                                 │
│  ┌──────────────────┐   ┌─────────────────────────────────────┐│
│  │ VoiceAssistant    │   │ WizardShell                         ││
│  │ (@11labs/client)  │──▶│ useWizard hook                      ││
│  │ STT → LLM → TTS  │   │ setFieldValue / goToStep / validate ││
│  │ Tool callbacks    │   │ Auto-save: localStorage + GitHub    ││
│  └────────┬──────────┘   └──────────────┬──────────────────────┘│
│           │ WebSocket                   │ REST                  │
└───────────┼─────────────────────────────┼───────────────────────┘
            │                             │
   ┌────────▼────────┐          ┌─────────▼─────────────┐
   │ ElevenLabs      │          │ Next.js API Routes     │
   │ Conversational  │          │ PUT /api/intake/[orgId] │
   │ AI Agent        │          │ → GitHub Contents API   │
   └─────────────────┘          └───────────────────────┘
```

### Data Flow

1. Admin creates an organization at `/admin` → generates a unique link
2. Client opens the link → 5-step wizard loads from JSON schema
3. Client fills fields manually OR talks to the voice assistant
4. Auto-save: localStorage (500ms debounce) + GitHub (2s debounce)
5. Optimistic locking handles concurrent saves (SHA-based)
6. On completion → thank you page with confetti

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | shadcn/ui, Tailwind CSS 4, Lucide icons |
| Validation | Zod 4 (JSON schema → runtime validators) |
| Backend | GitHub Contents API (no database) |
| Voice | ElevenLabs Conversational AI, @11labs/client |

---

## The 5-Step Form

| # | Step | ID | Key Fields |
|---|------|----|------------|
| 1 | Your Publication | `your-publication` | Name, tagline, topic, audience, key question, reader profile |
| 2 | Categories & Editors | `categories-and-editors` | Categories (repeating, min 3) + AI editors (auto-generated) |
| 3 | Sentiment & Scoring | `sentiment-and-scoring` | Tracker config, signal meanings, scoring calibration |
| 4 | Sources & Discovery | `sources-and-discovery` | RSS feeds + optional social profiles, organizations, triage topics |
| 5 | Review & Launch | `review-and-launch` | About page, completion checklist, cost estimate |

### Progressive Disclosure

Each step uses **sections** — collapsible groups of fields:
- Required sections always open
- Optional sections collapsed by default with "X fields" badge
- Section-level skip: "I don't need this" with consequence explanation
- Validation skips fields in skipped sections

### Smart Auto-Derivation

Fields auto-fill from earlier answers (only fills empty fields, never overwrites):
- `publication_name` + `tagline` → `full_title`
- `topic_label` → `community_label`, `publication_type`, `tracker_name`
- `tagline` → `llms_description`
- `publication_name` → `site_url` suggestion
- Categories → auto-generate editors with template expertise

---

## Voice Assistant

An ElevenLabs Conversational AI agent guides clients through the form via natural conversation. **Opt-in**: no `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` = no voice UI.

### How It Works

1. User clicks "Assisted Setup" in the header → panel opens
2. Clicks "Start Conversation" → WebSocket connects to ElevenLabs
3. Agent asks questions one at a time, fills fields via tool callbacks
4. User can pause/resume, close panel (call stays active), or end
5. At the end, agent validates all steps and calls `complete_form`

### Client-Side Tools

The agent has 6 tools that execute in the browser:

| Tool | Description |
|------|-------------|
| `update_field` | Set a single form field value |
| `update_repeating_group` | Set entries for a repeating group |
| `get_current_progress` | Check filled/empty fields + validation errors |
| `navigate_to_step` | Move to a specific form step (0-4) |
| `validate_all_steps` | Run validation across all steps at once |
| `complete_form` | Save and complete (shows thank you page) |

### Context Awareness

- On connect: form state sent via `sendContextualUpdate`
- On manual edits: updated state sent (debounced 3s)
- Errors included in progress updates so agent can help fix them

### System Prompt

Located at `config/assistant-prompt.md`. Editable from the admin panel. Defines:
- Conversation flow (question order per step)
- Guardrails (stay on topic, validate before committing)
- Auto-derivation rules
- End-of-process validation flow

### Knowledge Base

3 documents in `config/knowledge-base/`:
- `01-pipeline-overview.md` — how the 7-phase pipeline works
- `02-form-field-guide.md` — what each field does, pipeline impact, advice
- `03-best-practices-and-pitfalls.md` — cost optimization, quality tips

Uploaded to ElevenLabs KB with RAG for retrieval during conversations.

---

## Project Structure

```
src/
  app/
    [orgId]/page.tsx              # Intake form page
    admin/admin-client.tsx        # Admin UI — orgs + voice prompt editor
    api/intake/
      orgs/route.ts               # GET/POST organizations
      [orgId]/route.ts            # GET/PUT intake data
      assistant/route.ts          # POST: create/update ElevenLabs agent
      assistant/prompt/route.ts   # GET/PUT system prompt via GitHub

  components/intake/
    wizard-shell.tsx              # Main orchestrator + auto-derivation
    step-renderer.tsx             # Section-based field rendering
    field-renderer.tsx            # Routes field types to components
    voice-assistant.tsx           # Voice panel + ElevenLabs integration
    progress-bar.tsx              # Step navigation with dropdown
    step-nav.tsx                  # Bottom nav — Back/Next/Finish
    save-indicator.tsx            # Auto-save status display
    cost-estimate.tsx             # Pipeline cost breakdown table
    completion-checklist.tsx      # Per-step completion review
    category-assignment.tsx       # Editor-category mapping display
    sentiment-rules-editor.tsx    # Per-category sentiment rules
    fields/
      text-field.tsx              # Text + URL input
      textarea-field.tsx          # Multi-line with char counter
      number-field.tsx            # Numeric input
      select-field.tsx            # Dropdown with color dots
      checkbox-field.tsx          # Boolean checkbox
      repeating-group.tsx         # Add/remove entries (3 render modes)
      batch-input.tsx             # CSV/JSON bulk import
      skip-section.tsx            # Section skip toggle

  lib/intake/
    schemas.ts                    # Zod schemas + TypeScript types
    github.ts                     # GitHub Contents API helpers
    schema-to-zod.ts              # JSON → Zod validators + section-aware skipping
    use-wizard.ts                 # Client hook — state, validation, save

config/
  assistant-prompt.md             # Voice assistant system prompt
  knowledge-base/                 # Pipeline docs for agent RAG

src/data/
  ai-dossier-intake.json          # 5-step form schema with sections
```

---

## Deployment

### Vercel (recommended)

1. Connect GitHub repo
2. Set environment variables
3. Deploy

### Voice Assistant Setup

1. Add `ELEVENLABS_API_KEY` to env
2. `POST /api/intake/assistant` → creates agent, returns `agent_id`
3. Add `NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_...` to env
4. Restart — mic button appears in the form header

---

## Security

- **No authentication**: Links are unguessable (`{prefix}-{8 random digits}`)
- **No robots**: `robots.txt` + `noindex, nofollow` metadata
- **GitHub token**: Server-side only, `contents:write` scope
- **ElevenLabs key**: Server-side only, used for agent management API
- **Agent ID**: Client-side (public), only connects to your configured agent
