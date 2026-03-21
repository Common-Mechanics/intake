# Intake

JSON-driven onboarding wizard with GitHub backend. Built for Common Mechanics client onboarding.

## What this is

A standalone Next.js app that renders multi-step intake forms from a JSON schema definition. Clients get a unique link, fill in their publication details step by step, and the data saves to GitHub as JSON files.

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
```

## Architecture

See `.claude/plan.md` for the full architecture plan.

### Key concepts

- **Form schema** (`src/data/onboarding/*.json`) — JSON files that define wizard steps, fields, validation, and repeating groups
- **Wizard renderer** — generic React components that read a schema and produce the form UI
- **GitHub backend** — org data stored as `clients/{orgSlug}/intake.json` in the repo
- **Admin view** — `/admin` lists all organizations and their completion status

### Tech stack

- Next.js (App Router)
- shadcn/ui + Tailwind
- Zod for validation
- GitHub Contents API for persistence
- No database — GitHub is the backend

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
