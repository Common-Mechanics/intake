# Best Practices & Common Pitfalls

## Cost Optimization

### The Editor Multiplier Problem
Every editor reviews EVERY story. If triage flags 40 stories and you have 6 editors, that's 240 Sonnet calls per day just for reviews. With prompt caching the input tokens are cheap (~90% savings), but output tokens scale linearly.

**Recommendation**: Match editors 1:1 to categories. Don't create "extra" editors for niche sub-topics — fold those into a broader editor's expertise description instead. A Policy Editor who also understands trade policy is better (and cheaper) than separate Policy and Trade editors.

**Cost math**:
- 4 editors: ~$1.20/day for reviews ($36/month)
- 6 editors: ~$1.80/day ($54/month)
- 8 editors: ~$2.40/day ($72/month)
- Each additional editor adds ~$0.30/day ($9/month)

### Source Count vs Quality
More sources = more stories to process = higher costs and more noise. But each source only costs ~$0.015/day directly. The real cost is downstream: more flagged stories means more work for editors.

**Recommendation**: Start with 20-30 high-quality sources. Add more after seeing what the pipeline produces. 100 mediocre feeds produces worse output than 30 curated ones.

### The Opus Bottleneck
The Chief Editor phase uses Opus ($15/$75 per million tokens) — the most expensive model. This is a single daily call, but it processes ALL editor reviews. More editors = longer input to Opus.

**This is NOT a reason to reduce editors**. The Opus call is critical for quality and only runs once. But it explains why the base pipeline cost includes ~$0.80/day regardless of configuration.

## Quality Optimization

### The Key Question Is Everything
The `key_question` field shapes EVERY downstream judgment. A bad key question produces a mediocre publication even with perfect everything else.

**Good key questions**:
- "How does this affect the trajectory of global decarbonization?"
- "Does this change the balance of power between AI developers and regulators?"
- "What does this mean for independent writers and publishers?"

**Bad key questions**:
- "Is this about climate?" (too binary)
- "What are the socioeconomic implications of environmental policy changes on vulnerable communities?" (too academic)
- "Is the stock price going up?" (too narrow)

### Expertise Descriptions Make or Break Quality
We tested vague vs. specific editor expertise and the difference was dramatic:

**Vague** (produces generic reviews):
> "You are an expert in policy."

**Specific** (produces sharp reviews):
> "You are the Policy Editor — an expert in international climate negotiations, EU Green Deal implementation, and US federal climate regulation. You track COP proceedings, UNFCCC updates, and legislative committee actions. You understand whether policy moves are substantive or performative — a new 'commitment' without enforcement mechanisms is theater, while a quiet regulatory change with penalties has real teeth."

The second version lets the editor catch nuances that generic analysis misses.

### Negativity Bias Warning
LLMs have a natural negativity bias when analyzing news. Without explicit calibration:
- New regulation → scored as "negative" (burden)
- Whistleblower action → scored as "negative" (reveals problems)
- Safety improvements → scored as "negative" (implies prior danger)

**Fix**: The `scoring_positive` examples MUST include cases where serious-sounding news is actually positive. Explicitly state: "When new governance is introduced, this is positive because it represents progress, not bureaucratic burden."

### Category Overlap Destroys Classification
If "Policy" and "Governance" categories have overlapping auto_tags, stories bounce between them unpredictably. The reader sees inconsistent filtering.

**Fix**: Categories should be mutually exclusive. Each story fits ONE category. If two categories always contain the same stories, merge them. Test by imagining 10 recent stories — can you instantly assign each to exactly one category?

## Common Setup Mistakes

### Too Many Categories
- **Problem**: 10+ categories means most categories only get 0-1 stories per day. Empty categories look broken.
- **Fix**: 4-6 categories. Each should have 2+ stories daily.

### Too Many Editors
- **Problem**: Costs scale linearly. 10 editors = $3/day just for reviews.
- **Fix**: 1 editor per category + 1 Spotlight. That's usually 5-7 total.

### Too Few Sources
- **Problem**: Only 5 sources means you miss important stories.
- **Fix**: 20-30 sources across primary, analysis, media, and wire categories.

### Too Many Sources
- **Problem**: 100+ sources floods triage with noise. More false positives, more cost, worse signal-to-noise.
- **Fix**: 20-40 curated sources. Add specific feeds only when you notice coverage gaps.

### Vague Audience Description
- **Problem**: "Smart people" tells the pipeline nothing about language level or assumed knowledge.
- **Fix**: "Policy advisors at national environment ministries, reporters covering COP negotiations, ESG analysts screening investments."

### Missing Sentiment Calibration
- **Problem**: Without scoring examples, the pipeline defaults to generic sentiment analysis with negativity bias.
- **Fix**: Provide 2-3 concrete examples for positive, negative, AND neutral. Include edge cases.

### Skipping the Reader Profile
- **Problem**: Without a reader profile, the pipeline writes at a generic level — either too technical or too simple.
- **Fix**: Write 3-5 sentences describing expertise, context, and what the reader should take away. The magic phrase is "a curious professional reading over morning coffee."

## How the Final Product Looks

The published site (like aisafety.fyi) has:
1. **Daily dossier page** — 3 lead stories with analysis, 8-12 ticker items, 1-2 spotlight entries
2. **Category filters** — buttons matching the configured categories
3. **Sentiment tracker page** — chart showing the index over time, with per-story scoring
4. **About page** — content from the intake form
5. **Archive** — past dossiers searchable by date

Each lead story gets:
- A one-liner (headline)
- A briefing (2-3 paragraph analysis)
- Sentiment score (positive/negative/neutral)
- Intensity (0-3, capped by novelty class)
- Category assignment
- Source attribution

Ticker items get:
- One-liner only
- Sentiment + intensity
- Category

Spotlight items get:
- Special formatting for media content
- Podcast/video/demo tags
