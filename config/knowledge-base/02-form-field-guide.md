# Form Field Guide — What Each Field Does and Why It Matters

## Step 1: Your Publication

### publication_name
- **What it does**: Appears in the site header, browser tab title, social share cards, and email subject lines.
- **Pipeline impact**: None directly — purely branding.
- **Advice**: ALL CAPS works well for news-style publications (e.g., "CLIMATE DOSSIER"). Mixed case for softer brands.

### tagline
- **What it does**: One-line description shown in search results, social shares, and the site meta description.
- **Pipeline impact**: Used as fallback for `llms_description` (what AI crawlers see).
- **Advice**: Should communicate what the reader gets. "Daily intelligence on X" is a proven pattern.

### full_title
- **What it does**: Combined name + tagline, used in page titles and formal references.
- **Pipeline impact**: None.
- **Auto-derived**: From publication_name + tagline. Usually "[NAME] — [tagline]".

### topic_label
- **What it does**: 2-4 word topic identifier used EVERYWHERE in the pipeline.
- **Pipeline impact**: HIGH. This shapes triage relevance, novelty classification, and is injected into every editor prompt. It's the single most important configuration value.
- **Advice**: Be specific but not too narrow. "climate policy" works better than "international environmental governance" or just "climate". It should be a noun phrase that completes "stories about ___".
- **Common mistake**: Making this too broad ("technology") or too narrow ("EU carbon border adjustment mechanism"). Aim for a Goldilocks zone.

### site_url
- **What it does**: The domain where the publication lives. Used for canonical URLs, sitemap, and social cards.
- **Pipeline impact**: None — deployment concern only.

### publisher_name / publisher_url
- **What it does**: Credits the organization behind the publication. Shows in footer and About page.
- **Pipeline impact**: None.

### audience_description
- **What it does**: Describes who reads the publication. Used in editorial prompts.
- **Pipeline impact**: MEDIUM. Editors use this to calibrate language complexity and what to explain vs. assume known.
- **Advice**: List 2-4 concrete reader types. "climate policy advisors, environmental journalists, ESG analysts" is much better than "people interested in climate".
- **Common mistake**: Being too vague ("smart people") or too narrow ("PhD atmospheric scientists at German research institutes").

### key_question
- **What it does**: THE editorial North Star. Every story is evaluated against this question.
- **Pipeline impact**: CRITICAL. This is injected into triage, every editor review, the chief editor's selection, and the final dossier writing. It shapes importance scores, lead selection, and story framing.
- **Advice**: Frame as "How does this affect ___?" Works best as a question about trajectory or impact, not a factual question. Example: "How does this affect the trajectory of global decarbonization?" NOT "What is the current carbon price?"
- **Common mistake**: Making it too academic ("What are the epistemological implications...") or too narrow ("Does this affect EU ETS prices?").

### reader_profile
- **What it does**: Detailed description of the ideal reader. Used in editorial and writing prompts.
- **Pipeline impact**: HIGH. This shapes writing style, assumed knowledge level, and what gets explained.
- **Advice**: Write in second person: "You are writing for..." Describe expertise level, professional context, and what they need to take away. 3-5 sentences.
- **Common mistake**: We initially described our audience too technically and the pipeline produced jargon-heavy copy. Describing the reader as "a curious professional reading over morning coffee" dramatically improved readability.

### publication_type (optional)
- **What it does**: Sentence fragment describing the publication type. Used in prompts and metadata.
- **Auto-derived**: From topic_label → "[topic] intelligence briefing"
- **Advice**: Usually the auto-derived value is fine. Change if the publication isn't a "briefing" — could be "watchdog", "monitor", "digest", etc.

### community_label (optional)
- **What it does**: What you call your reader community. Used in community pulse features.
- **Auto-derived**: From topic_label → "the [topic] community"

## Step 2: Categories & Editors

### categories (repeating group)
- **What it does**: Defines the taxonomy. Every story gets classified into exactly one category.
- **Pipeline impact**: HIGH. Categories appear as filter buttons on the site, organize the editorial workflow, and determine which editor reviews what.

#### categories.short_label
- **Advice**: 1-2 words. These become button labels. "Policy", "Science", "Finance" — not "Climate Policy & Governance".

#### categories.full_name
- **Advice**: The descriptive name. "Climate Policy & Governance" — this shows in tooltips and editor descriptions.

#### categories.auto_tags
- **What it does**: Keywords that help the pipeline classify stories. If a story mentions these words, it's a strong signal for this category.
- **Pipeline impact**: MEDIUM. Used in the automatic classification step.
- **Advice**: List 5-10 keywords, comma-separated. Mix broad and specific: "governance, regulation, legislation, treaty, COP, UNFCCC, policy framework".
- **Common mistake**: Too few tags (just "policy") makes classification unreliable. Too many overlapping tags between categories creates confusion.

**How many categories?**
- **Minimum**: 3 (enforced by validation)
- **Sweet spot**: 4-6
- **Maximum practical**: 8 (beyond this, categories overlap too much and stories get misclassified)
- **Important**: Each category should have enough daily story volume to regularly appear (at least 1-2 stories per day). If two categories always contain the same stories, merge them.

### editors (repeating group)
- **What it does**: Defines the AI editors who review every story.
- **Pipeline impact**: CRITICAL for quality and CRITICAL for cost. Each editor reviews ALL stories.

#### editors.editor_name
- **Advice**: "[Category] Editor" is the convention. Plus a "Spotlight Editor" for non-news content.

#### editors.category
- **Advice**: Must match a category short_label (lowercase). The "spotlight" category is special — it's for podcasts, videos, demos, and interesting non-news content.

#### editors.is_spotlight
- **Advice**: Only check this for the Spotlight editor. This tells the pipeline to look for media content, not news.

#### editors.expertise
- **What it does**: THIS IS THE MOST IMPORTANT FIELD FOR QUALITY. Each editor's expertise description becomes their entire personality and judgment criteria.
- **Pipeline impact**: CRITICAL. Vague expertise = generic reviews. Specific expertise = sharp, domain-aware reviews.
- **Advice**: Write 1-2 paragraphs. Structure as:
  1. "You are the [X] Editor — an expert in [domain]."
  2. "You specialize in: [bullet list of 3-5 sub-areas]"
  3. "You notice when [what makes your perspective unique]."
  4. "You track [key organizations and developments]."
- **Common mistake**: "You are an expert in policy" produces generic reviews. "You are an expert in international climate negotiations, EU Green Deal implementation, and US federal climate regulation. You track COP proceedings, UNFCCC updates, and legislative committee actions. You understand whether policy moves are substantive or performative." produces sharp reviews.

**How many editors?**
- **Minimum**: 1 per category + 1 Spotlight = your category count + 1
- **Cost impact**: Each editor adds ~$0.30/day (with prompt caching). 5 editors ≈ $1.50/day for the review phase alone.
- **Quality vs cost**: More editors = more perspectives but diminishing returns. The chief editor synthesizes all reviews, so having 3 editors who each say "this is important" isn't 3× better than 1 saying it.
- **Recommendation**: Match editors to categories 1:1. Don't create extra editors "just in case" — each one costs money every day.

## Step 3: Sentiment & Scoring

### tracker_name
- **What it does**: The metric name shown in navigation and charts.
- **Advice**: Should evoke direction/movement. "[Topic] Risk Index", "[Topic] Progress Tracker", "[Topic] Momentum Score".

### tracker_subtitle
- **Advice**: Longer version for page titles. Often same as tracker_name with "— Sentiment Index" appended.

### tracker_nav_label
- **Default**: "Tracker"
- **Advice**: Keep it short — it's a navigation tab. "Tracker", "Index", "Pulse" all work.

### positive_signal_label / negative_signal_label
- **Default**: "progress" / "risk"
- **What it does**: Labels on the sentiment indicators next to stories. "+2 progress points" or "-1 risk point".
- **Advice**: Choose words that feel natural: "progress/risk", "trust/erosion", "green/red", "advance/setback".

### what_positive_means / what_negative_means
- **What it does**: One-sentence definitions that the pipeline uses to classify stories.
- **Pipeline impact**: HIGH. This directly shapes how every story gets scored.
- **Advice**: Be concrete about what "better" and "worse" mean in the client's domain. "Decarbonization is accelerating — policy, finance, or technology moving in the right direction" is much better than "things are getting better".

### fallback_sentiment_question
- **What it does**: When a story's sentiment isn't obvious, the pipeline uses this as a tiebreaker.
- **Pipeline impact**: MEDIUM. Only used for ambiguous stories.
- **Advice**: Frame as a yes/no question about direction. "Is the world's trajectory toward net-zero getting better or worse?"

### scoring_positive / scoring_negative / scoring_neutral
- **What it does**: Calibration examples. The pipeline uses these to understand what "clearly positive" vs "clearly negative" looks like in this domain.
- **Pipeline impact**: HIGH. Bad calibration = biased scoring.
- **Advice**: Give 2-3 concrete, real-world examples each. Be specific: "New binding emissions targets signed into law" not "good policy news".
- **Common mistake**: We discovered a strong negativity bias in early builds. The model treated all serious stories as negative, even defensive improvements. Adding explicit "this is positive because..." calibration fixed this. If you don't define what's positive, the pipeline assumes serious = negative.

### sentiment_rules_by_category (optional, per-category)
- **What it does**: Override rules for specific situations where general sentiment analysis fails.
- **Pipeline impact**: MEDIUM. Only fires for matching situations.
- **Advice**: Focus on non-obvious cases. "When new regulation is introduced in [category], this is POSITIVE because it represents governance progress, not bureaucratic burden." The pipeline already gets obvious cases right.
- **Skip for now**: Most clients add these after seeing the pipeline in action for a week.

### tracker_concept_url (optional)
- **Advice**: Link to a Wikipedia article or blog post explaining the concept. Shown on the tracker page. Not used by the pipeline.

## Step 4: Sources & Discovery

### sources (repeating group)
- **What it does**: RSS feeds the pipeline monitors every day.
- **Pipeline impact**: CRITICAL. No sources = no stories = no publication.

#### sources.name
- **Advice**: Human-readable name. "Carbon Brief", "The Guardian Climate".

#### sources.url
- **What it does**: The RSS feed URL.
- **Advice**: Try /feed, /rss, /feed.xml on the site. Most news sites and blogs have RSS. If unsure, use the site homepage — the client can fix the URL later.

#### sources.tags
- **What it does**: Which categories this source covers. Comma-separated.
- **Pipeline impact**: LOW — the pipeline classifies stories independently. Tags help with initial sorting.

#### sources.notes
- **What it does**: Internal notes. Not used by the pipeline.

**How many sources?**
- **Minimum**: 1 (enforced)
- **Sweet spot**: 20-30
- **Maximum practical**: 50-60
- **Cost impact**: Each source adds ~$0.015/day (tiny). The real cost is downstream — more sources = more stories flagged = more stories for editors to review.
- **Quality advice**: A smaller set of 20 trusted, high-quality sources produces better output than 100 mediocre feeds full of noise. Curate aggressively.
- **Good mix**: 5-10 primary sources (orgs that make news), 5-10 analysis (newsletters, blogs), 5-10 media (journalists covering the beat), 5-10 wire services.

### bluesky_handles / x_handles / linkedin_urls (optional)
- **What it does**: Feeds into the "community pulse" feature. The pipeline checks these profiles for engagement signals (likes, reposts, karma).
- **Pipeline impact**: LOW-MEDIUM. Adds social context to stories but doesn't affect selection.
- **Advice**: 10-20 handles per platform is plenty. Focus on key voices: researchers, journalists, advocates who are active commentators.

### key_organizations (optional)
- **What it does**: Stories mentioning these organizations get a score bonus.
- **Pipeline impact**: MEDIUM. Helps important stories surface above noise.
- **Advice**: List 10-15 organizations whose actions are most newsworthy. Don't list too many — if everything gets a bonus, nothing does.
- **Common mistake**: Listing 50+ organizations. The bonus becomes meaningless. Focus on the 10-15 that, when they act, it's always news.

### triage_topics (optional)
- **What it does**: Broad topic filter. Anything not matching these topics gets discarded before editors see it.
- **Pipeline impact**: MEDIUM. Acts as a pre-filter to reduce noise.
- **Advice**: 4-6 broad topics. "Climate litigation and legal precedents", "Corporate emissions reporting". Be generous — better to let a few irrelevant stories through than miss something important.

## Step 5: Review & Launch

### about_what_is_this
- **What it does**: About page intro for first-time visitors.
- **Pipeline impact**: None — static content.
- **Advice**: 2-3 sentences. What is this, who is it for, why should they care.

### about_tracker
- **What it does**: Explains the sentiment tracker on the About page.
- **Advice**: 2-3 sentences. What does the tracker measure, what does it show, why does it matter.

### about_built_by
- **What it does**: Organization intro on the About page.
- **Advice**: 1-2 sentences. Who you are and why you built this.

### llms_description
- **What it does**: One-line description for AI crawlers (llms.txt standard).
- **Auto-derived**: From tagline.
- **Pipeline impact**: None — SEO/discoverability only.
