# Intake

JSON-driven onboarding wizard with voice assistant and GitHub backend. Built for Common Mechanics client onboarding.

## What this is

A Next.js app that renders a 5-step intake form from a JSON schema. Clients get a unique link, fill in their publication details (manually or via voice assistant), and the data saves to GitHub. An admin panel at `/admin` manages organizations and the voice assistant prompt.

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
```

## Architecture

### Key concepts

- **Form schema** (`src/data/ai-dossier-intake.json`) — 5-step schema with sections for progressive disclosure
- **Sections** — collapsible field groups within steps; optional sections can be skipped
- **Wizard renderer** — generic React components that read the schema and produce the form UI
- **Voice assistant** — ElevenLabs Conversational AI agent that guides users through the form via voice; opt-in via env var
- **GitHub backend** — org data stored as `clients/{orgId}/intake.json` in the repo
- **Admin view** — `/admin` lists organizations, manages voice assistant prompt

### Tech stack

- Next.js 16 (App Router), React 19
- shadcn/ui + Tailwind CSS 4
- Zod 4 for validation (JSON schema → Zod at runtime)
- GitHub Contents API for persistence (no database)
- ElevenLabs Conversational AI + @11labs/client (voice assistant)

## Constraints

- No new dependencies without asking
- All UI uses shadcn/ui + Tailwind — no custom CSS classes
- Mobile-first — Luke Wroblewski form design principles
- Auto-save to localStorage, explicit save to GitHub

## Related

- Source project: [ai-dossier](https://github.com/Common-Mechanics/ai-dossier)
- Client preparation guide: `ai-dossier/docs/client-preparation-guide.md`
- Intake form prompt: `ai-dossier/docs/intake-form-prompt.md`
- Airtable setup: `ai-dossier/docs/airtable-setup.md`
