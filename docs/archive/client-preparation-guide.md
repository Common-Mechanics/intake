# Client Preparation Guide

Everything you need to prepare before we set up your publication. Work through each section and fill in the answers — this is your editorial blueprint. The more specific you are here, the better your first builds will be.

Estimated time: 2-3 hours of thinking, not coding.

---

## 1. Publication Identity

The basics. What is this thing called?

- [ ] **Publication name** — what appears in the header, browser tab, and social cards
  - Example: *"CLIMATE DOSSIER"*, *"AI WHISTLEBLOWER"*, *"CYBER PULSE"*
  - Your name: ___

- [ ] **One-line tagline** — appears in search results and social shares (max ~150 characters)
  - Example: *"Daily intelligence on corporate AI accountability — whistleblower cases, transparency, and oversight."*
  - Your tagline: ___

- [ ] **Domain / URL** — where the site will live
  - Example: *"https://climatdossier.org"*
  - Your URL: ___

- [ ] **Publisher** — your organization name and website
  - Example: *"Climate Action Network — https://climatenetwork.org"*
  - Your publisher: ___

---

## 2. Your Audience

This is the most important section. It shapes every single AI prompt in the pipeline — what gets flagged as relevant, how stories are scored, and how copy is written.

- [ ] **Who reads this?** — list 2-4 reader types (comma-separated)
  - Example: *"climate policy advisors, environmental journalists, ESG analysts, and sustainability professionals"*
  - Your audience: ___

- [ ] **Reader profile** — 3-5 sentences describing your ideal reader. Be specific about their expertise level and what they should take away from each briefing.
  - Example: *"You are writing for smart professionals who follow climate policy but are not scientists. Think: a policy advisor at a national environment ministry, a reporter covering COP negotiations, or an ESG analyst screening investments. They should understand WHY a development matters without needing atmospheric chemistry. Write clearly, lead with policy impact, explain technical terms on first use."*
  - Your profile: ___

**Lesson from our experience:** We initially described our audience too technically. The pipeline produced jargon-heavy copy nobody outside the field understood. Describing the reader as *"a curious professional reading over morning coffee"* dramatically improved readability. **Write for who you want to reach, not who you already have.**

---

## 3. Topic Scope

Define the boundaries of what your publication covers.

- [ ] **Topic label** — a short phrase used throughout the pipeline (2-4 words)
  - Example: *"climate policy"*, *"AI accountability"*, *"cybersecurity"*
  - Your topic: ___

- [ ] **What's relevant?** — 4-6 bullet points defining what gets flagged during triage
  - Example:
    - *"National and international climate legislation and treaties"*
    - *"Corporate emissions reporting and greenwashing"*
    - *"Renewable energy policy and fossil fuel regulation"*
    - *"Climate litigation and legal precedents"*
    - *"IPCC reports and major climate science publications"*
  - Your topics:
    - ___
    - ___
    - ___
    - ___

- [ ] **The key question** — the analytical lens for every story. This single question shapes how importance is scored and how research is framed.
  - Example: *"How does this affect the trajectory of global decarbonization? Think through policy incentives, corporate behavior, and public pressure dynamics."*
  - Your question: ___

---

## 4. Five Categories

Every story gets classified into one of 5 categories. These appear as filter pills on the site, as column headers in the tracker, and in the editorial workflow.

**Rules of thumb:**
- Cover your topic's major dimensions — don't overlap
- Each category should have enough daily volume to regularly appear (at least 1-2 stories/day)
- If two categories always contain the same stories, merge them

- [ ] **Category 1:** ___ (label: ___, full name: ___)
- [ ] **Category 2:** ___ (label: ___, full name: ___)
- [ ] **Category 3:** ___ (label: ___, full name: ___)
- [ ] **Category 4:** ___ (label: ___, full name: ___)
- [ ] **Category 5:** ___ (label: ___, full name: ___)

Example for a climate publication:

| Label | Full name | Covers |
|---|---|---|
| Policy | Climate Policy & Governance | Legislation, treaties, COP, NDCs, carbon markets |
| Science | Climate Science & Research | IPCC, temperature data, tipping points, attribution |
| Industry | Energy & Industry | Renewables, fossil fuels, EVs, emissions data, corporate net-zero |
| Finance | Climate Finance & ESG | Green bonds, ESG regulation, divestment, carbon credits |
| Legal | Climate Litigation | Lawsuits, court rulings, corporate accountability, greenwashing cases |

---

## 5. Six Editors

The pipeline has 6 AI editors who each review every story through their domain lens. Five match your categories; the sixth is always a "Spotlight" editor who finds interesting media content (podcasts, videos, demos).

For each editor, write a paragraph describing:
1. Who they are and what they're expert in
2. What specific sub-areas they cover (as a bullet list)
3. What they care most about / what they notice that generalists miss

- [ ] **Editor 1** (matches Category 1): ___
- [ ] **Editor 2** (matches Category 2): ___
- [ ] **Editor 3** (matches Category 3): ___
- [ ] **Editor 4** (matches Category 4): ___
- [ ] **Editor 5** (matches Category 5): ___
- [ ] **Spotlight Editor** (media/fun content): ___

Example for a "Policy Editor":
> *You are the Policy Editor — an expert in climate governance, international negotiations, and national legislation. You track COP proceedings, UNFCCC updates, EU Green Deal implementation, and US climate policy.*
>
> *Your domain covers:*
> - *International treaties: Paris Agreement implementation, NDC updates, Loss and Damage fund*
> - *National legislation: IRA implementation, EU CBAM, UK net-zero strategy*
> - *Carbon markets: EU ETS, voluntary markets, Article 6 mechanisms*
> - *Institutional decisions: central bank climate mandates, SEC climate disclosure rules*
>
> *You understand whether policy moves are substantive or performative. You notice when implementation timelines slip quietly.*

**Lesson from our experience:** Vague expertise ("you are an expert in policy") produces generic reviews. Listing specific organizations, sub-areas, and judgment criteria produces sharp, domain-aware assessments. The more specific, the better.

---

## 6. Sources (RSS Feeds)

List 20-60 RSS feeds the pipeline should monitor. Group them by your categories.

**What makes a good source mix:**
- **Primary sources** (5-10) — organizations that make news (government agencies, research institutions, industry bodies)
- **Analysis** (5-10) — newsletters, blogs, think tank publications that provide expert commentary
- **Media** (5-10) — journalists and outlets that cover your beat
- **Community** (optional, 5-10) — forums, social media voices, podcasts
- **Wire services** (5-10) — general news outlets that cover your topic

For each source, you need:
- Name
- RSS feed URL (tip: try `https://example.com/feed`, `/rss`, `/feed.xml`, or `/index.xml`)
- Category tags (which of your 5 categories does it relate to?)

- [ ] I've compiled a list of at least 20 sources with RSS feed URLs

**Lesson from our experience:** Start with 20-30 high-quality sources. You can always add more later. A smaller set of trusted sources produces better output than 100 mediocre feeds full of noise.

**Tip:** To verify an RSS feed works, run: `curl -s "https://feed-url" | head -50`

---

## 7. Community Monitoring (Optional)

If your field has active social media discussion, the pipeline can monitor:

- **Bluesky accounts** — list handles of key researchers, journalists, advocates
- **Forums** — LessWrong, specialist Discourse forums, etc.

This data feeds into two features:
1. **Social signals** — engagement counts (likes, karma) shown to editors as a tiebreaker
2. **Community Pulse** — a daily synthesis of "what the community is talking about"

- [ ] **Bluesky handles** (if applicable): list 10-30 key voices in your field
- [ ] **Forums** (if applicable): URL + API endpoint if available

---

## 8. Scoring & Calibration

Every story gets an importance score from 3.0 to 9.5. The pipeline needs concrete examples of what each tier looks like **in your domain** — without these, everything clusters around 6.0-7.0.

Give 2-3 examples per tier:

- [ ] **9.0–9.5 (Paradigm shifts):** ___
  - Example: *"Paris Agreement signed, IPCC declares 1.5°C overshoot inevitable, major fossil fuel company declares bankruptcy from stranded assets"*

- [ ] **8.0–8.9 (Field-shaping):** ___
  - Example: *"EU Carbon Border Adjustment takes effect, US rejoins Paris Agreement, first successful climate liability lawsuit against oil major"*

- [ ] **6.5–7.9 (Important):** ___
  - Example: *"New national climate plan published, major green bond issuance, significant court ruling on greenwashing"*

- [ ] **5.0–6.4 (Relevant):** ___
  - Example: *"Quarterly emissions data released, industry group publishes voluntary standard, personnel change at environment agency"*

- [ ] **3.0–4.9 (Background):** ___
  - Example: *"Routine regulatory filing, minor policy update, tangential energy market news"*

---

## 9. Sentiment Tracker

The tracker measures whether things in your domain are getting better or worse. Every story gets scored as positive, negative, or neutral.

- [ ] **Tracker name** — what users see in the nav and charts
  - Example: *"Climate Risk Index"*, *"Trust Score"*, *"Momentum Tracker"*
  - Your name: ___

- [ ] **Positive signals are called:** ___
  - Example: *"progress points"*, *"trust points"*, *"green points"*

- [ ] **Negative signals are called:** ___
  - Example: *"risk points"*, *"erosion points"*, *"red points"*

- [ ] **What positive means** (one sentence):
  - Example: *"Decarbonization is accelerating — policy, finance, or technology moving in the right direction."*
  - Your definition: ___

- [ ] **What negative means** (one sentence):
  - Example: *"Decarbonization is slowing — rollbacks, delays, or new obstacles."*
  - Your definition: ___

- [ ] **Fallback question** — when sentiment isn't obvious, the pipeline asks this:
  - Example: *"Is the world's trajectory toward net-zero getting better or worse?"*
  - Your question: ___

---

## 10. Sentiment Rules

For each of your 5 categories, define 3-6 rules that tell the pipeline when something is positive, negative, or neutral. Think: "When X happens in this category, is that good or bad for my domain?"

**Focus on the non-obvious cases.** The pipeline gets the obvious ones right ("new regulation → probably positive"). Your rules should handle the edge cases.

- [ ] **Category 1 rules:**
  - When ___ → positive, because ___
  - When ___ → negative, because ___
  - When ___ → neutral

- [ ] **Category 2 rules:** (same format)
- [ ] **Category 3 rules:** (same format)
- [ ] **Category 4 rules:** (same format)
- [ ] **Category 5 rules:** (same format)

**Lesson from our experience:** We discovered a strong negativity bias in early builds. The model treated all security-related stories as negative, even defensive improvements. Adding explicit "this is positive because..." rules for the non-obvious cases fixed this. **If you don't define what's positive, the pipeline assumes serious = negative.**

---

## 11. Key Organizations

List 10-15 organizations whose actions are most newsworthy in your field. Stories mentioning these get a score bonus.

- [ ] ___
- [ ] ___
- [ ] ___
- [ ] (aim for 10-15)

**Tip:** Don't list too many. If everything gets a bonus, nothing does.

---

## 12. Branding Assets

- [ ] **OG image** (1200×630 px) — shown when your site is shared on social media. Should include your publication name and a visual identity.
- [ ] **Favicon** (SVG preferred) — the small icon in the browser tab.

---

## 13. About Page Content

Write 2-3 sentences for each section:

- [ ] **"What is this"** — describe your publication for a first-time visitor
- [ ] **"Sources"** — briefly describe the types of sources you monitor
- [ ] **"Tracker"** — explain your sentiment tracker (what it measures, why it matters)
- [ ] **"Built by"** — describe your organization

---

## 14. Deployment Info

- [ ] **Anthropic API key** — powers the editorial pipeline (~$2-5/day). Get one at [console.anthropic.com](https://console.anthropic.com)
- [ ] **OpenAI API key** — powers embeddings for dedup + event matching (~$0.02/day). Get one at [platform.openai.com](https://platform.openai.com)
- [ ] **Domain** — where the site will be hosted
- [ ] **Preferred hosting** — Vercel (simplest), Cloudflare Workers, or other
- [ ] **Build schedule** — what time should the daily briefing publish? (default: 10:00 AM your timezone)

---

## Checklist Summary

Before we start setup, confirm you have:

- [ ] Publication name, URL, tagline, publisher
- [ ] Audience description (reader profile, 3-5 sentences)
- [ ] Topic scope (topic label, 4-6 triage bullet points, key question)
- [ ] 5 categories with labels and descriptions
- [ ] 6 editor descriptions (5 matching categories + 1 spotlight)
- [ ] 20+ RSS feed URLs with category tags
- [ ] Scoring examples for each of the 5 tiers
- [ ] Tracker name, positive/negative labels, sentiment definitions
- [ ] Sentiment rules for each category (3-6 rules each)
- [ ] 10-15 key organizations
- [ ] OG image (1200×630) and favicon (SVG)
- [ ] About page content (4 sections)
- [ ] API keys (Anthropic + OpenAI)
- [ ] Domain and hosting preference
- [ ] Build schedule / timezone

Once you send us this, we can have your publication running within a day.
