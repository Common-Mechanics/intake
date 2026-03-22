# AI Dossier Pipeline — How It Works

## What They're Building

Clients are setting up their own version of aisafety.fyi — an AI-powered daily intelligence briefing. The pipeline runs automatically every day, transforming RSS feeds into a curated publication with editorial analysis, sentiment tracking, and community signals.

The intake form configures everything the pipeline needs: what to monitor, how to evaluate stories, who the audience is, and what "good news" vs "bad news" means in their domain.

## The Daily Pipeline (7 Phases)

Every day, the pipeline runs these phases in sequence:

### Phase 1: Triage (Haiku 4.5)
- Fetches all RSS feeds the client configured in "Sources"
- Batches them 10 at a time to Haiku for relevance flagging
- Haiku decides: is this story relevant to the client's topic?
- Typically flags 30-80 stories from 20-40 sources
- **Form connection**: The `sources` repeating group directly controls what gets fetched. The `topic_label` and `key_question` shape what Haiku considers "relevant."

### Phase 1b: Novelty Classification (Sonnet 4.6)
- Every flagged story gets classified into 1 of 9 novelty classes
- Classes range from "breaking_empirical" (genuinely new data) to "commentary_speculative" (opinion)
- This classification CAPS the maximum score a story can get — commentary can never score as high as breaking news
- **Form connection**: This uses the `key_question` and `audience_description` to understand what counts as novel for THIS audience.

### Phase 1c: Event Matching (Sonnet + embeddings)
- Stories get matched against a persistent event timeline
- If today's story is about an ongoing event, the pipeline knows it's a continuation, not breaking news
- Uses OpenAI embeddings to find candidate matches, then Sonnet confirms
- **Form connection**: No direct form field — this is automatic. But the `categories` and `auto_tags` help the pipeline understand the domain structure.

### Phase 2: Editor Review (Sonnet 4.6 × N editors)
- THIS IS THE MOST IMPORTANT PHASE and the most expensive
- Every flagged story goes to ALL editors simultaneously
- Each editor rates: relevance (0-10), importance (1-10), recommendation (lead/ticker/skip)
- Uses prompt caching — the story batch is cached and reused across all editors, saving ~90% of input tokens
- **Form connection**: The `editors` repeating group defines who reviews. Each editor's `expertise` field is their entire personality and judgment criteria. The `category` field determines which category lens they apply. The `is_spotlight` flag creates a special editor for non-news content.

### Phase 3: Chief Editor (Opus 4.6)
- The most expensive single call — uses Opus for maximum judgment quality
- Resolves editorial debates: when editors disagree, the chief decides
- Selects exactly 3 leads, 8-12 ticker items, 1-2 spotlight entries
- **Form connection**: The `key_question` and `reader_profile` shape the chief's editorial judgment. The categories determine how stories are balanced across sections.

### Phase 4-5: Research + Produce (Sonnet 4.6)
- Deep research on the 3 lead stories: fetches full article text, generates analysis
- Writes the final dossier: one-liners, briefings, sentiment scores, intensity ratings
- Uses extended thinking (16K token budget) for internal reasoning about scoring
- **Form connection**: The `what_positive_means`, `what_negative_means`, and `fallback_sentiment_question` directly shape how every story gets scored. The `scoring_positive`, `scoring_negative`, `scoring_neutral` examples calibrate the model.

### Phase 6: Dedup QA (Haiku + embeddings)
- Finds semantically similar stories within today's dossier and vs. recent days
- Removes duplicates so the publication stays fresh
- **Form connection**: No direct form field — automatic quality control.

## The Sentiment Tracker

The sentiment tracker is a core feature — it visualizes whether things in the client's domain are getting better or worse over time.

- Every story gets a sentiment score: positive, negative, or neutral
- Stories also get an intensity score (0-3) based on how significant the event is
- The tracker aggregates these into a daily index
- It appears as a chart on the publication website with a navigation tab

**Form fields that control this:**
- `tracker_name`: What the metric is called (e.g., "Climate Risk Index")
- `positive_signal_label` / `negative_signal_label`: What the arrows are labeled
- `what_positive_means` / `what_negative_means`: How the pipeline understands direction
- `fallback_sentiment_question`: Tiebreaker for ambiguous stories
- `scoring_positive/negative/neutral`: Calibration examples
- `sentiment_rules_by_category`: Override rules for specific situations

## Cost Structure

Pipeline costs are dominated by LLM API calls:

| Phase | Model | Cost Driver |
|-------|-------|-------------|
| Triage | Haiku ($0.80/$4/M tokens) | Number of sources |
| Novelty | Sonnet ($3/$15/M tokens) | Number of flagged stories |
| Event matching | Sonnet + embeddings | Fixed daily cost |
| Editor review | Sonnet × N editors | **Number of editors** (biggest variable) |
| Chief editor | Opus ($15/$75/M tokens) | Fixed (1 call/day, most expensive per-call) |
| Research + Produce | Sonnet | Fixed (proportional to selected stories) |
| Dedup QA | Haiku + embeddings | Minimal |

**Key insight for clients**: The number of editors is the single biggest cost lever. Each editor reviews ALL stories, so 6 editors costs 6× what 1 editor costs for that phase. The prompt caching helps (~90% savings on input), but output tokens scale linearly.
