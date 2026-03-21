# Airtable Base Setup

How to create the Airtable base that clients fill in. The conversion script (`scripts/airtable-to-config.js`) reads the base and generates `config/tenant.yaml` + `sources.yaml`.

---

## Quick start

1. Create a new Airtable base
2. Create the 12 tables below with the specified fields
3. Pre-fill the rows marked "pre-fill"
4. Share the base with your client (editor access)
5. Once filled in, run:
   ```bash
   AIRTABLE_TOKEN=pat... AIRTABLE_BASE_ID=app... node scripts/airtable-to-config.js
   ```

---

## Tables

### 1. Publication Settings (1 row)

All scalar configuration. The client fills in one row.

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Publication Name | Single line text | Yes | — |
| Full Title | Single line text | Yes | — |
| Tagline | Single line text | Yes | — |
| Site URL | URL | Yes | — |
| Data Base URL | URL | No | — |
| Publisher Name | Single line text | Yes | — |
| Publisher URL | URL | Yes | — |
| OG Image Path | Single line text | No | `/og.png` |
| Plausible Analytics Script | URL | No | — |
| Audience Description | Single line text | Yes | — |
| Publication Type | Single line text | Yes | — |
| Topic Label | Single line text | Yes | — |
| Key Question | Long text | Yes | — |
| Community Label | Single line text | No | — |
| Reader Profile | Long text | Yes | — |
| Tracker Name | Single line text | Yes | — |
| Tracker Subtitle | Single line text | Yes | — |
| Positive Signal Label | Single line text | Yes | — |
| Negative Signal Label | Single line text | Yes | — |
| Tracker Stat Label | Single line text | No | — |
| Tracker Concept URL | URL | No | — |
| What "Positive" Means | Long text | Yes | — |
| What "Negative" Means | Long text | Yes | — |
| Fallback Sentiment Question | Long text | Yes | — |
| Tracker Nav Label | Single line text | Yes | — |
| Tracker Nav Path | Single line text | No | `/tracker` |
| RSS Proxy URL | URL | No | — |
| LLMs.txt Description | Long text | No | — |
| Key Org Score Bonus | Number | No | `1.5` |
| Safety/Policy Score Bonus | Number | No | `1.0` |
| Minimum Score Threshold | Number | No | `4.0` |

### 2. Categories (5 rows)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Short Label | Single line text | Yes | — |
| Full Name | Single line text | Yes | — |
| ID (slug) | Single line text | Yes | — |
| Auto-Tags | Multiple select | No | — |
| Sort Order | Number | Yes | 1-5 |

### 3. Editors (6 rows)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Editor Name | Single line text | Yes | "Editor 1"…"Spotlight Editor" |
| Category | Single line text | Yes* | — |
| Is Spotlight | Checkbox | No | Row 6: checked |
| Expertise | Long text | Yes | — |
| Sort Order | Number | Yes | 1-6 |

*Not required for Spotlight editor.

### 4. Sources (many rows)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Source Name | Single line text | Yes | — |
| Feed URL | URL | Yes | — |
| Feed Type | Single select: `RSS`, `Scrape` | Yes | `RSS` |
| Category Tags | Multiple select | Yes | — |
| Notes | Long text | No | — |

### 5. Scoring Anchors (5 rows)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Score Range | Single line text | Yes | `9.0–9.5`, `8.0–8.9`, `6.5–7.9`, `5.0–6.4`, `3.0–4.9` |
| Tier Label | Single line text | Yes | `Paradigm shifts`, `Field-shaping events`, `Important developments`, `Relevant news`, `Background signal` |
| Your Examples | Long text | Yes | — |
| Sort Order | Number | Yes | 1-5 |

### 6. Sentiment Rules (many rows)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Category Group | Single line text | Yes | — |
| Category Group Key | Single line text | Yes | — |
| Key Test Question | Long text | No | — |
| When This Happens | Long text | Yes | — |
| Default Sentiment | Single select: `positive`, `negative`, `neutral` | Yes | — |
| Because | Long text | No | — |
| Note | Long text | No | — |
| Sort Order | Number | No | — |

### 7. Key Organizations (many rows)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Organization Name | Single line text | Yes | — |

### 8. Triage Topics (4-6 rows)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Topic | Single line text | Yes | — |
| Sort Order | Number | No | — |

### 9. About Page Sections (6 rows)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Section Label | Single line text | Yes | `What is this`, `Sources`, `Tracker`, `Built by`, `Privacy`, `Sources` |
| Content | Long text | Yes* | Pre-fill Privacy row |
| Component | Single line text | No | Last row: `source-list` |
| Sort Order | Number | Yes | 1-6 |

*Except rows with a Component value.

### 10. Privacy Page Sections (6 rows, fully pre-filled)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Section Label | Single line text | Yes | `Overview`, `Analytics`, `Custom events`, `External links`, `Hosting`, `Contact` |
| Content | Long text | Yes | Pre-fill all with generic Plausible/GitHub Pages text |
| Sort Order | Number | Yes | 1-6 |

### 11. Bluesky Accounts (optional, many rows)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Handle | Single line text | Yes | — |
| Display Name | Single line text | Yes | — |
| Affiliation | Single line text | No | — |
| Domain | Single select (uses category IDs) | No | — |

### 12. Priority Weights (6-8 rows)

| Field | Type | Required | Pre-fill |
|---|---|---|---|
| Priority Category | Single line text | Yes | — |
| Weight | Number (1-5) | Yes | — |
| Sort Order | Number | No | — |

---

## Conversion workflow

```bash
# 1. Set credentials
export AIRTABLE_TOKEN=pat...
export AIRTABLE_BASE_ID=app...

# 2. Run conversion
node scripts/airtable-to-config.js

# 3. Review output
cat config/tenant.yaml
cat sources.yaml

# 4. Add keyword filters if needed (not in Airtable — too technical)
# Edit config/tenant.yaml → arxiv_keywords and general_media sections

# 5. Validate + sync + build
node scripts/validate-tenant-config.js
node scripts/sync-tenant-config.js
cd web && npm run build
```

---

## Notes

- **Table names must match exactly** — the script fetches by table name
- **Multiple select fields** (Auto-Tags, Category Tags) — add options as the client needs them
- **Linked records** are optional — the script works with plain text Category fields on Editors
- **Privacy page** is fully pre-filled — the client just reviews it
- **Keyword filters** (arXiv, general media) are NOT in Airtable — too technical for clients, added by the setup engineer after import
- **Tracker info modals** are auto-generated from the tracker settings — not in Airtable
