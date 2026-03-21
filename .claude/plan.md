# Plan: Onboarding Wizard

## Context

The AI Dossier platform needs a client onboarding tool. Clients receive a unique link (e.g., `/onboarding/climateco`), fill in a multi-step wizard with their publication details (identity, audience, categories, editors, sources, scoring, sentiment rules), and the data saves to GitHub as JSON. An admin view at `/onboarding/admin` lists all organizations and their completion status.

The wizard is JSON-driven: a form schema file defines the steps, fields, validation, and repeating groups. The renderer is generic — the AI Dossier intake form is the first schema, but the engine works for any form.

## Architecture

### Data flow

```
Form Schema JSON → WizardShell (client) → field components
                                        → auto-save to localStorage (debounced 500ms)
                                        → explicit "Save" → PUT /api/onboarding/[orgSlug]
                                                          → GitHub Contents API
                                                          → clients/{orgSlug}/intake.json
```

### File structure

```
web/src/
  app/onboarding/
    layout.tsx                     — clean layout, hides SiteHeader/footer
    [orgSlug]/page.tsx             — loads schema + saved data, renders WizardShell
    admin/page.tsx                 — lists all orgs, view/download data
    _components/
      wizard-shell.tsx             — orchestrator: progress, nav, state provider
      step-renderer.tsx            — renders one step's fields
      field-renderer.tsx           — switch on field.type
      fields/
        text-field.tsx             — Input (text, url)
        textarea-field.tsx         — multiline
        number-field.tsx           — numeric
        select-field.tsx           — shadcn Select
        checkbox-field.tsx         — boolean
        repeating-group.tsx        — add/remove rows
      progress-bar.tsx             — step dots, clickable for completed steps
      step-nav.tsx                 — prev/next/save, bottom-anchored on mobile
      save-indicator.tsx           — "Saved" / "Saving..." badge
  api/onboarding/
    [orgSlug]/route.ts             — GET/PUT intake data via GitHub API
    orgs/route.ts                  — GET org index for admin
  lib/
    schemas/onboarding.ts          — Zod schemas for form schema + saved data
    onboarding/
      github.ts                    — GitHub Contents API helpers (read/write/exists)
      schema-to-zod.ts            — converts JSON validation rules → Zod validators
      use-wizard.ts               — client hook: state, auto-save, validation, nav
  data/onboarding/
    ai-dossier-intake.json        — the 10-step intake form schema
```

### Form schema format

```json
{
  "id": "ai-dossier-intake",
  "version": 1,
  "title": "Client Intake",
  "steps": [
    {
      "id": "identity",
      "title": "Publication Identity",
      "description": "What is your publication called?",
      "fields": [
        {
          "id": "publication_name",
          "type": "text",
          "label": "Publication Name",
          "help": "Appears in headers and social cards",
          "placeholder": "CLIMATE DOSSIER",
          "validation": { "required": true, "maxLength": 100 }
        }
      ]
    }
  ]
}
```

Field types: `text`, `url`, `textarea`, `number`, `select`, `checkbox`, `repeating`.
Supports: `validation` (required, min/maxLength, pattern), `condition` (show if sibling field equals value), `defaultValue`, `readOnly`, `help`, `placeholder`.

### GitHub storage

```
clients/
  index.json          — [{ id, name, status, created_at, last_modified }]
  climateco/
    intake.json       — { schemaId, schemaVersion, data: {...}, completedSteps: [...], lastSaved }
```

Env vars: `GITHUB_TOKEN` (contents:write scope), `GITHUB_REPO` (owner/repo).

### Component hierarchy

```
page.tsx (server) → loads schema JSON + fetches GitHub data
  └─ WizardShell (client) → useWizard hook
       ├─ ProgressBar — step dots
       ├─ Card → StepRenderer → FieldRenderer → field components
       └─ StepNav — prev/next/save, fixed bottom on mobile
```

### Mobile (Luke Wroblewski principles)

- Progress bar: dots only (no labels) on mobile
- Card: edge-to-edge (no border/shadow/radius) on mobile
- StepNav: fixed to bottom with safe-area inset padding
- Touch targets: 48px minimum on buttons
- Validation: inline on blur, batch on "Next"

### Onboarding layout

Client component that hides SiteHeader and footer on mount, restores on unmount. Renders children in a centered container with max-w-2xl.

## Implementation order

1. Zod schemas (`lib/schemas/onboarding.ts`)
2. GitHub helpers (`lib/onboarding/github.ts`)
3. API routes (`api/onboarding/[orgSlug]/route.ts`, `api/onboarding/orgs/route.ts`)
4. Form schema JSON (`data/onboarding/ai-dossier-intake.json`) — all 10 steps from intake-form-prompt.md
5. schema-to-zod runtime validator (`lib/onboarding/schema-to-zod.ts`)
6. useWizard hook (`lib/onboarding/use-wizard.ts`)
7. Field components (6 types + repeating group)
8. StepRenderer + FieldRenderer
9. WizardShell + ProgressBar + StepNav + SaveIndicator
10. Onboarding layout
11. Page component
12. Admin view

## Verification

1. `npm run build` — verify no type errors
2. Navigate to `/onboarding/test-org` — wizard loads with all 10 steps
3. Fill in fields → check localStorage for auto-save
4. Click "Save" → verify `clients/test-org/intake.json` appears in GitHub repo
5. Refresh page → data persists from GitHub
6. Navigate to `/onboarding/admin` → test-org appears with status
7. Mobile: test on 375px viewport — bottom nav, edge-to-edge cards, 48px targets
8. `npx vitest run --project unit` — existing tests still pass
