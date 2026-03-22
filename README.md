# Intake

JSON-driven onboarding wizard with GitHub backend. Built for Common Mechanics client onboarding.

Clients receive a unique link (e.g., `intake.commonmechanics.io/aiwi-24329427`), fill in a multi-step wizard with their publication details, and the data saves to GitHub as JSON files. An admin view at `/admin` lets you create organizations, track completion, and download data.

---

## Quick Start

```bash
npm install
npm run dev
```

### Environment Variables

Create `.env.local`:

```env
GITHUB_TOKEN=ghp_...          # Personal access token with contents:write scope
GITHUB_REPO=owner/repo         # Repository for storing client data
GITHUB_BRANCH=main             # Optional, defaults to "main"
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub PAT with `contents:write` scope |
| `GITHUB_REPO` | Yes | Target repo in `owner/repo` format |
| `GITHUB_BRANCH` | No | Branch to read/write (default: `main`) |

### Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
```

---

## Architecture

### How It Works

```
Form Schema JSON  →  WizardShell (client)  →  Field components
                                            →  Auto-save to localStorage (500ms debounce)
                                            →  Explicit "Save" → PUT /api/intake/[orgId]
                                                               → GitHub Contents API
                                                               → clients/{orgId}/intake.json
```

1. Admin creates an organization at `/admin` → generates a unique link like `/aiwi-24329427`
2. Client opens the link → 10-step wizard loads with the form schema
3. Client fills in fields → auto-saved to localStorage, explicit save to GitHub
4. Multiple users can use the same link — optimistic locking handles concurrent saves
5. Admin views progress, downloads data, or copies links from `/admin`

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | shadcn/ui (base-nova), Tailwind CSS 4, Lucide icons |
| Validation | Zod 4 (schema + runtime) |
| Backend | GitHub Contents API (no database) |
| State | localStorage (client draft) + GitHub (server persistence) |
| Notifications | Sonner (toast) |

### No Database

GitHub is the backend. All data lives as JSON files in the configured repository:

```
clients/
  index.json                    # Array of OrgEntry (org list with status)
  climate-45820731/
    intake.json                 # SavedData (form responses + metadata)
  aiwi-24329427/
    intake.json
```

---

## Project Structure

```
src/
  app/
    [orgId]/
      page.tsx                  # Intake form page (server component)
      layout.tsx                # Clean layout — no header/footer
      not-found.tsx             # 404 for invalid org links
    admin/
      page.tsx                  # Admin dashboard (server component)
      admin-client.tsx          # Admin UI — org list, create dialog (client)
      layout.tsx                # Admin layout (max-w-5xl centered)
    api/intake/
      orgs/route.ts             # GET: list orgs, POST: create org
      [orgId]/route.ts          # GET: read data, PUT: save data
    page.tsx                    # Root → redirects to /admin
    layout.tsx                  # Root layout — fonts, Toaster, metadata
    globals.css                 # Tailwind v4 theme, editorial styles

  components/
    intake/
      wizard-shell.tsx          # Main orchestrator — useWizard + layout
      step-renderer.tsx         # Renders one step's fields
      field-renderer.tsx        # Switch on field.type → correct component
      progress-bar.tsx          # Step dots (desktop) / bar (mobile)
      step-nav.tsx              # Bottom nav — Back/Next/Save
      save-indicator.tsx        # "Saving..." / "Saved" / "Draft saved locally"
      conflict-dialog.tsx       # Merge conflict resolution dialog
      fields/
        text-field.tsx          # Text + URL input (globe icon for URLs)
        textarea-field.tsx      # Multi-line with char counter
        number-field.tsx        # Numeric input
        select-field.tsx        # Dropdown (shadcn Select)
        checkbox-field.tsx      # Boolean checkbox
        repeating-group.tsx     # Add/remove/reorder entries
        batch-input.tsx         # CSV paste + JSON upload for bulk data
        skip-section.tsx        # "I don't need this" toggle
    ui/                         # shadcn/ui components (auto-generated)

  lib/intake/
    schemas.ts                  # Zod schemas + TypeScript types
    github.ts                   # GitHub Contents API helpers
    schema-to-zod.ts            # JSON validation rules → Zod validators
    use-wizard.ts               # Client hook — state, validation, save, nav
    logger.ts                   # Structured error logging

  data/
    ai-dossier-intake.json      # 10-step intake form schema
```

---

## API Reference

### `POST /api/intake/orgs` — Create Organization

Creates a new org and generates a unique intake form link.

**Request:**
```json
{
  "name": "Climate Dossier",
  "prefix": "climate",
  "schemaId": "ai-dossier-intake"
}
```

**Response (201):**
```json
{
  "id": "climate-45820731",
  "name": "Climate Dossier",
  "schemaId": "ai-dossier-intake",
  "createdAt": "2026-03-22T10:30:00Z",
  "lastModified": "2026-03-22T10:30:00Z",
  "status": "not_started",
  "completedSteps": 0,
  "totalSteps": 0
}
```

The `id` is generated as `{prefix}-{8 random digits}` — e.g., `climate-45820731`. This becomes the URL path: `/{id}`.

| Status | Errors |
|--------|--------|
| 400 | Invalid data (validation failed) |
| 500 | GitHub API error |

---

### `GET /api/intake/orgs` — List Organizations

Returns all organizations from `clients/index.json`.

**Response (200):** Array of `OrgEntry` objects (see Data Structures below).

---

### `GET /api/intake/[orgId]` — Read Intake Data

Fetches saved form data for an organization.

**Response (200):** `SavedData` object with the GitHub file SHA attached.

| Status | Errors |
|--------|--------|
| 404 | Org doesn't exist |
| 500 | GitHub API error |

---

### `PUT /api/intake/[orgId]` — Save Intake Data

Updates intake data with optimistic locking.

**Request:** `SavedData` object (including `sha` from previous GET).

**Response (200):** Updated `SavedData` with new SHA.

**Side effects:**
- Writes `clients/{orgId}/intake.json` to GitHub
- Updates `clients/index.json` with new status, step count, last modified

| Status | Errors |
|--------|--------|
| 400 | Invalid data (Zod validation failed) |
| 409 | Conflict — SHA mismatch (someone else saved). Response includes current server data for merge. |
| 500 | GitHub API error |

---

## Data Structures

### Form Schema (input — defines the wizard)

```typescript
FormSchema {
  id: string                      // "ai-dossier-intake"
  version: number                 // 1
  title: string                   // "Publication Setup"
  steps: StepDef[]
}

StepDef {
  id: string                      // "publication-identity"
  title: string                   // "Publication Identity"
  description?: string            // Shown below the title
  hint?: string                   // Editorial tip in an Alert callout
  fields: FieldDef[]
  optional?: {                    // "I don't need this section" toggle
    label: string
    consequences: string          // Informative, not scary
  }
}

FieldDef {
  id: string                      // "publication_name"
  type: "text" | "url" | "textarea" | "number" | "select" | "checkbox" | "repeating"
  label: string
  help?: string                   // Always-visible hint with examples
  placeholder?: string
  defaultValue?: unknown
  readOnly?: boolean
  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    min?: number                  // For number fields
    max?: number
    pattern?: string              // Regex
    minItems?: number             // For repeating groups
    maxItems?: number
    warnAbove?: number            // Show warning badge above this count
    warnMessage?: string
  }
  condition?: {                   // Show only when sibling field matches
    field: string
    equals: unknown
  }
  options?: { label: string; value: string }[]   // For select fields
  fields?: FieldDef[]                             // Sub-fields for repeating groups
  batchInput?: {                                  // Bulk import support
    enabled: boolean
    csvColumns?: string[]
    jsonExample?: string
  }
}
```

### SavedData (stored in GitHub)

```typescript
SavedData {
  schemaId: string                // "ai-dossier-intake"
  schemaVersion: number           // 1
  orgId: string                   // "climate-45820731"
  orgName: string                 // "Climate Dossier"
  data: Record<string, unknown>   // Flat map of field_id → value
  skippedSections: string[]       // Step IDs the user chose to skip
  completedSteps: string[]        // Step IDs with valid data
  lastSaved: string               // ISO timestamp
  lastSavedBy?: string            // Optional user identifier
  sha?: string                    // GitHub file SHA (for optimistic locking, not stored)
}
```

### OrgEntry (in `clients/index.json`)

```typescript
OrgEntry {
  id: string                      // "climate-45820731"
  name: string                    // "Climate Dossier"
  schemaId: string                // "ai-dossier-intake"
  createdAt: string               // ISO timestamp
  lastModified: string            // ISO timestamp
  status: "not_started" | "in_progress" | "completed"
  completedSteps: number
  totalSteps: number
}
```

---

## Form Schema: AI Dossier Intake

The default schema (`src/data/ai-dossier-intake.json`) has 10 steps:

| # | Step | ID | Required | Key Fields |
|---|------|----|----------|------------|
| 1 | Publication Identity | `publication-identity` | Yes | Name, full title, tagline, site URL, publisher |
| 2 | Your Audience | `audience` | Yes | Audience description, reader profile, topic label, key question |
| 3 | Categories | `categories` | Yes | Repeating group (min 3) — label, full name, slug, auto-tags |
| 4 | Editorial Team | `editors` | Yes | Repeating group (min 3, warns >6) — name, category, expertise |
| 5 | Sentiment Tracker | `sentiment-tracker` | Yes | Tracker name, labels, definitions, 3-tier scoring (good/bad/neutral) |
| 6 | Sentiment Rules | `sentiment-rules` | No | Repeating group — category, situation, sentiment, reasoning |
| 7 | Social Profiles | `social-profiles` | No | Bluesky, X.com, LinkedIn handles (batch input) |
| 8 | Key Orgs & Topics | `organizations-and-topics` | No | Organizations + triage topics (batch input) |
| 9 | Sources | `sources` | Yes | RSS feeds — name, URL, tags, notes (batch input) |
| 10 | About & Final | `about-and-final` | No | About page sections, LLMs description |

**Optional sections** have an "I don't need this section" checkbox with an informative message about what happens if skipped.

**Batch input** is enabled on sources, social profiles, organizations, and triage topics — users can paste CSV or upload JSON instead of typing entries one by one.

---

## Validation

Validation happens at three levels:

### 1. Per-field on blur

When a user leaves a text, textarea, number, or select field, the field validates immediately and shows inline errors.

### 2. Per-step on "Next"

Clicking "Next" runs Zod validation on all fields in the current step. If any fail:
- Error messages appear on the fields
- The viewport scrolls to the first error
- The first errored field receives focus

### 3. Server-side on PUT

The API route validates the entire `SavedData` payload with Zod before writing to GitHub.

### How it works

`schema-to-zod.ts` converts JSON validation rules into Zod validators at runtime:

| JSON Rule | Zod Equivalent |
|-----------|---------------|
| `required: true` | Field is non-optional |
| `minLength: 3` | `z.string().min(3)` |
| `maxLength: 100` | `z.string().max(100)` |
| `pattern: "^[a-z]+$"` | `z.string().regex(...)` |
| `min: 1` / `max: 10` | `z.number().min(1).max(10)` |
| `minItems: 3` | `z.array().min(3)` |
| `type: "url"` | `z.string().url()` |

Conditional fields (`condition`) are automatically optional when their condition isn't met. Skipped sections bypass validation entirely.

---

## Concurrency & Optimistic Locking

Multiple users can access the same intake form link simultaneously. Conflicts are handled via GitHub's SHA-based optimistic locking:

1. Client loads data → receives `sha` from GitHub
2. Client saves → sends `sha` with the PUT request
3. If another user saved in between, GitHub rejects the write (SHA mismatch)
4. API returns `409 Conflict` with the current server data
5. Client shows a dialog: "Someone else made changes"
   - **"Keep my changes"** — overwrites server with local data
   - **"Use their changes"** — discards local, loads server version

---

## UX Features

### Mobile-First Design

- Edge-to-edge cards on mobile (no border/shadow/radius)
- Card wrapper with subtle shadow on desktop
- Fixed bottom navigation with safe-area padding
- 48px minimum touch targets
- 16px input font size (prevents iOS auto-zoom)
- Branding header hidden on mobile to save space

### Editorial Premium Feel

- Source Serif 4 (serif) for headings — gives a magazine-like quality
- Geist Sans for body text
- Generous whitespace (gap-6 between fields, gap-8 between sections)
- Subtle step transition animations (fade + slide up)
- Step descriptions in `text-foreground/70` — readable but subordinate

### Auto-Save

- **localStorage**: Debounced 500ms after any field change. Key: `intake-draft-{orgId}`
- **GitHub**: Explicit "Save" button or "Save & Complete" on the last step
- Save indicator shows: "Draft saved locally" → "Saving..." → "Saved"
- `beforeunload` warning prevents accidental tab close with unsaved changes

### Accessibility

- `aria-invalid` and `aria-describedby` on all form controls
- `role="alert"` on error messages (announced by screen readers)
- Focus management: heading receives focus on step transitions
- Keyboard navigation: Ctrl/Cmd+Enter advances the form
- Unique IDs on all skip-section checkboxes (per step)
- Proper ARIA tabs on batch input CSV/JSON toggle

### Repeating Groups

- Add/remove entries with + and X buttons
- Reorder with up/down arrow buttons
- Card titles show first field value (e.g., "Policy" instead of "#1")
- Warning badge when count exceeds `warnAbove` threshold
- Empty state with guidance: "No categories added yet. You'll need at least 3 to continue."
- Undo toast on entry deletion (restore with one click)

### Batch Input

For fields like sources, social profiles, and organizations, users can import data in bulk:

- **CSV Paste**: Paste tab-separated or comma-separated data into a textarea. Smart delimiter detection.
- **JSON Upload**: Drag-and-drop or click to upload a `.json` file. Also accepts pasting JSON directly.
- Preview shows parsed entry count before importing
- Entries are appended (not replaced)
- Visual drag-over state on the drop zone

### Optional Sections

Steps marked as optional show an "I don't need this section" checkbox at the top. When checked:
- An informative Alert explains consequences (e.g., "Without custom sentiment rules, the pipeline will use general-purpose sentiment analysis...")
- All fields dim and become non-interactive
- The section counts as "completed" for progress tracking
- Validation is skipped

---

## Adding a New Form Schema

The wizard renderer is generic — `ai-dossier-intake.json` is just the first schema. To add another:

1. Create a new JSON file in `src/data/` following the `FormSchema` structure
2. Import it in the page component that should use it
3. When creating orgs via the admin, use the new schema's `id` as `schemaId`

The entire field rendering, validation, save, and navigation system works with any valid schema.

---

## Deployment

### Vercel (recommended)

1. Connect the GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy — no special configuration needed

### Other Hosts

Any Node.js 20+ host that supports Next.js App Router:

```bash
npm run build
npm run start
```

Set the three environment variables (`GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`) in your host's configuration.

### DNS

For `intake.commonmechanics.io`, point a CNAME to your deployment (e.g., `cname.vercel-dns.com`).

---

## Security Notes

- **No authentication**: Anyone with an org link can fill in the form. Links are unguessable (`{prefix}-{8 random digits}`).
- **No robots**: `robots.txt` blocks all crawlers. Metadata has `robots: { index: false, follow: false }`.
- **GitHub token**: Server-side only — never exposed to the client. Needs `contents:write` scope.
- **No secrets in forms**: The intake form collects editorial content, not credentials or PII.

---

## Constraints

- No new npm dependencies without asking
- All UI uses shadcn/ui + Tailwind — no custom CSS classes
- Mobile-first — Luke Wroblewski form design principles
- Auto-save to localStorage, explicit save to GitHub
- European date format in admin: "22nd Mar 2026"
