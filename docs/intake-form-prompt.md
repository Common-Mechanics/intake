# Intake Form Builder Prompt

Use this prompt with Airtable's AI form builder, Fillout.co, Tally, or any AI-powered form tool to create the client intake form. The form writes to the Airtable base "Dossier Client Template" (ID: apphiTFaojEILEtsK).

---

## Prompt

Create a multi-step intake form for onboarding a new client to a daily intelligence briefing platform. The form should feel professional and guide the client through editorial decisions step by step. Use a warm, clear tone — the client is not a developer.

### Form Structure

The form has **10 pages/steps**. Each page maps to an Airtable table. Fields marked "repeating group" should allow the user to add multiple entries (rows in the table).

---

**Page 1: Publication Identity**
*Description: "Let's start with the basics — what is your publication called and where will it live?"*

Table: `Publication Settings` (single record — all fields on this page write to one row)

Fields:
- Publication Name (short text, required) — "What's your publication called?" Example: "CLIMATE DOSSIER", "CYBER PULSE"
- Full Title (short text, required) — "Full title with tagline" Example: "CLIMATE DOSSIER — Daily Climate Policy Briefing"
- Tagline (short text, required) — "One-line description for search results and social shares (max 150 characters)"
- Site URL (URL, required) — "Where will the site live?" Example: "https://climatedossier.org"
- Publisher Name (short text, required) — "Your organization name"
- Publisher URL (URL, required) — "Your organization's website"

---

**Page 2: Your Audience**
*Description: "This is the most important section. It shapes how every story is evaluated and written. Think about who you want reading this every morning."*

Table: `Publication Settings` (same record as Page 1)

Fields:
- Audience Description (short text, required) — "Who reads this? List 2-4 reader types." Example: "climate policy advisors, environmental journalists, ESG analysts"
- Publication Type (short text, required) — "How would you describe this publication in a sentence fragment?" Example: "climate policy intelligence briefing", "corporate accountability watchdog"
- Topic Label (short text, required) — "Your topic in 2-4 words. Used everywhere in the pipeline." Example: "climate policy", "AI accountability", "cybersecurity"
- Key Question (long text, required) — "The single analytical question every story is evaluated against. This shapes how importance is scored." Example: "How does this affect the trajectory of global decarbonization?"
- Community Label (short text, optional) — "What do you call your community?" Example: "the climate policy community", "the cybersecurity community"
- Reader Profile (long text, required) — "Describe your ideal reader in 3-5 sentences. Who are they? What's their expertise level? What should they take away?" Include this hint: "Tip: Write for who you want to reach, not who you already have. 'A curious professional reading over morning coffee' works better than 'domain experts with PhDs.'"

---

**Page 3: Categories**
*Description: "Every story gets classified into one of 5 categories. These appear as filter buttons on your site and organize the editorial workflow. Pick 5 that cover your topic's major dimensions without overlapping."*

Table: `Categories` (repeating group — exactly 5 entries)

Each entry:
- Short Label (short text, required) — "Short label for the filter button" Example: "Policy"
- Full Name (short text, required) — "Full category name" Example: "Climate Policy & Governance"
- ID slug (short text, required) — "URL-friendly ID (lowercase, no spaces)" Example: "policy"
- Auto-Tags (short text, optional) — "Comma-separated tags that auto-map stories to this category" Example: "governance, regulation, legislation, treaty"

Pre-fill Sort Order 1-5 automatically.

---

**Page 4: Editorial Team**
*Description: "Your publication has 6 AI editors. Five match your categories — each reviews every story through their domain expertise. The sixth is a Spotlight editor who finds interesting media content (podcasts, videos, demos). The more specific you write each editor's expertise, the sharper their reviews will be."*

Table: `Editors` (repeating group — exactly 6 entries, last one pre-filled as Spotlight)

Each entry:
- Editor Name (short text, required) — "Editor title" Example: "Policy Editor"
- Category (short text, required for 1-5, pre-fill "spotlight" for #6) — "Which category does this editor cover?"
- Expertise (long text, required) — "Write 1-2 paragraphs: who they are, what sub-areas they cover (as a bullet list), and what they notice that generalists miss." Include this hint: "Tip: 'You are the Policy Editor — an expert in climate governance and international negotiations' works much better than 'you are an expert in policy.'"

Pre-fill entry 6 with: Editor Name = "Spotlight Editor", Category = "spotlight", Is Spotlight = true. Include helper text: "The Spotlight editor finds notable podcasts, videos, demos, and entertaining content. You can customize the description or keep the default."

Pre-fill Sort Order 1-6 automatically.

---

**Page 5: Sentiment Tracker**
*Description: "Your publication includes a sentiment tracker that measures whether things in your domain are getting better or worse over time. Every story gets scored as positive, negative, or neutral. Name your tracker and define what those directions mean."*

Table: `Publication Settings` (same record as Pages 1-2)

Fields:
- Tracker Name (short text, required) — "What's your tracker called? Appears in the nav and charts." Example: "Climate Risk Index", "Trust Score", "Momentum Tracker"
- Tracker Subtitle (short text, required) — "Subtitle for metadata" Example: "Climate Policy Sentiment Index"
- Positive Signal Label (short text, required) — "What are positive signals called?" Example: "progress points", "trust points"
- Negative Signal Label (short text, required) — "What are negative signals called?" Example: "risk points", "erosion points"
- Tracker Nav Label (short text, required) — "Tab label in the navigation bar" Example: "Tracker", "Risk Index"
- What Positive Means (long text, required) — "In one sentence, what does a positive signal mean in your domain?" Example: "Decarbonization is accelerating — policy, finance, or technology moving in the right direction."
- What Negative Means (long text, required) — "In one sentence, what does a negative signal mean?" Example: "Decarbonization is slowing — rollbacks, delays, or new obstacles."
- Fallback Sentiment Question (long text, required) — "When sentiment isn't obvious, the pipeline asks this question to decide." Example: "Is the world's trajectory toward net-zero getting better or worse?"
- Tracker Concept URL (URL, optional) — "Link to a page explaining your metric concept (Wikipedia, blog post, etc.)"

---

**Page 6: Scoring Calibration**
*Description: "Every story gets an importance score from 3.0 to 9.5. Without calibration examples, everything clusters around 6.0-7.0. Give 2-3 concrete examples of stories from your domain for each tier — real events your audience would instantly recognize."*

Table: `Scoring Anchors` (repeating group — exactly 5 entries, ranges and labels pre-filled)

Each entry:
- Score Range (short text, read-only/pre-filled) — "9.0–9.5", "8.0–8.9", "6.5–7.9", "5.0–6.4", "3.0–4.9"
- Tier Label (short text, read-only/pre-filled) — "Paradigm shifts", "Field-shaping events", "Important developments", "Relevant news", "Background signal"
- Your Examples (long text, required) — "Give 2-3 examples of stories that would score in this range"

---

**Page 7: Sentiment Rules**
*Description: "For each of your 5 categories, define rules that tell the pipeline when something is positive, negative, or neutral. Focus on the non-obvious cases — the pipeline already gets the obvious ones right. Think: 'When X happens in this category, is that good or bad for my domain?'"*

Include this hint at the top: "Tip: If you don't define what's positive, the pipeline assumes serious = negative. Explicit 'this is positive because...' rules fix this."

Table: `Sentiment Rules` (repeating group — multiple entries per category, user adds rows)

Each entry:
- Category Group (short text, required) — "Which category do these rules apply to?" Example: "Climate Policy"
- Category Group Key (short text, required) — "Category ID (lowercase, matches your category slug)" Example: "policy"
- When This Happens (long text, required) — "Describe the situation" Example: "New regulation creates binding emissions targets"
- Default Sentiment (dropdown: positive / negative / neutral, required)
- Because (long text, optional) — "Why is this positive/negative?" Example: "governance strengthened"

Show hint: "Aim for 3-6 rules per category. You can always refine these after seeing your first few builds."

---

**Page 8: Key Organizations & Triage Topics**
*Description: "Two quick lists: the organizations that matter most in your field, and the topic areas your publication should monitor."*

Two sections on this page:

**Section A: Key Organizations**
Table: `Key Organizations` (repeating group — aim for 10-15)

Each entry:
- Organization Name (short text, required)

Include hint: "Stories mentioning these organizations get a score bonus. List 10-15 whose actions are most newsworthy. Don't list too many — if everything gets a bonus, nothing does."

**Section B: Triage Topics**
Table: `Triage Topics` (repeating group — aim for 4-6)

Each entry:
- Topic (short text, required) — "A short phrase defining what's relevant" Example: "Climate litigation and legal precedents"

Include hint: "These are the first filter — anything not matching these topics gets discarded before the editors even see it. Be generous — better to flag too many than miss something."

---

**Page 9: Sources (RSS Feeds)**
*Description: "List the RSS feeds your publication should monitor daily. Start with 20-30 high-quality sources — you can always add more later."*

Table: `Sources` (repeating group — aim for 20-60)

Each entry:
- Source Name (short text, required) — "Publication or organization name"
- Feed URL (URL, required) — "RSS feed URL. Tip: try /feed, /rss, /feed.xml, or /index.xml on the site"
- Category Tags (short text, required) — "Comma-separated tags (use your category IDs)" Example: "policy, governance"
- Notes (long text, optional) — "Any notes about this source (for your reference, not used by the pipeline)"

Include hint: "A good mix: 5-10 primary sources (orgs that make news), 5-10 analysis (newsletters, blogs), 5-10 media (journalists covering your beat), 5-10 wire services."

---

**Page 10: About Page & Final Details**
*Description: "Almost done! Write a few sentences for your About page and provide any final details."*

**Section A: About Page**
Table: `About Page Sections` (pre-filled rows — client fills in Content field)

Show 4 fields (the other 2 rows are pre-filled and hidden):
- "What is this" — Content (long text, required) — "Describe your publication in 2-3 sentences for a first-time visitor"
- "Tracker" — Content (long text, required) — "Explain your sentiment tracker — what it measures and why it matters"
- "Built by" — Content (long text, required) — "Describe your organization in 1-2 sentences"

**Section B: Deployment**
Table: `Publication Settings` (same record)

- LLMs Description (long text, optional) — "One-sentence description for AI crawlers" Example: "Daily climate policy intelligence briefing curated from 60+ sources."

---

**Completion page:**
*"Thank you! We have everything we need to set up your publication. You'll hear from us within 24 hours with a preview build. In the meantime, if you want to refine any answers, you can reopen this form."*

### Form Design Notes

- Use a progress bar showing step X of 10
- Each page should have a description at the top explaining why this section matters
- Include example text in field descriptions (not as placeholder text that disappears)
- Repeating groups should start with the minimum number of entries and let the user add more with a "+" button
- The Scoring Anchors page should show pre-filled ranges and labels as read-only context alongside the editable "Your Examples" field
- Long text fields (Reader Profile, Expertise, Sentiment Rules) should be tall enough for 3-5 lines
- Use conditional logic: if Community Label is filled on Page 2, show Page 7's community monitoring section; otherwise skip it
