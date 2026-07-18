# Cottage Bakery Social Intelligence

A self-hosted tool for cottage food producers (starting with bakers) to track
competitors and inspiration accounts, log which specific posts/reels are
working, watch niche trends, and turn all of that into reusable content
templates and a posting calendar.

It answers four questions:

1. **Who are the successful cottage food producers in my niche, and what
   makes them work?** → `Producers`
2. **Which specific posts/reels have actually performed well, and why?**
   → `Posts & Reels`
3. **What formats/flavors/aesthetics are going viral right now?**
   → `Trends`
4. **What should I post next, and how exactly do I shoot/write it?**
   → `Recommendations` → `Templates` → `Idea Calendar`

## How the pieces fit together

```
Producers  ──┐
             ├──► Posts/Reels (logged with engagement metrics) ──┐
Trends    ───┘                                                   ├──► Recommendations
                                                                   │    (auto-computed)
Templates ◄────────────────────────────────────────────────────┘
    │
    ▼
Idea Calendar (idea → planned → shot → posted)
```

The **Recommendations** page doesn't use any external API or AI call — it's
plain aggregation over what you've logged: average engagement rate by
content type, by hook, by format, which high-fit trends have no template
yet, and which content types you've seen work but haven't templated. It gets
more useful the more you log, by design — there's no way to recommend real
posts without real data, so the tool is built to make logging fast rather
than to fake insight from nothing.

**Engagement rate** = `(likes + comments + shares + saves) / views × 100`, or
when a post has no view count logged, `(likes + comments + shares + saves) /
producer follower_count × 100` instead. The fallback matters in practice:
Instagram only exposes view counts publicly for Reels, not for photo/carousel
posts, and cottage bakery accounts post a lot of photos — without the
fallback, every photo post would incorrectly show 0% engagement.

## What's pre-loaded

The database seeds itself on first run with:

- **5 real, publicly-documented baking accounts** (Fitwaffle, Ikneadbread,
  Jessi Deily, Deanna Martinez-Bey, Tanya & Mike Clowers) with their
  reported follower counts, content style, and what specifically makes each
  of them work — sourced from public coverage (see the `source` field on
  each producer). These are general baking-influencer *benchmarks*, not the
  real cottage-food dataset — most operate at commercial-influencer scale,
  not as licensed home operators. Handles/URLs are intentionally left blank
  where not independently verified; confirm before relying on them.
- **7 current (2026) baking-niche trends** — visible filling/texture
  reveals, the cake pop resurgence, wafer paper decorating, sourdough
  scoring, "dump and mix" simplicity recipes, cruffins, and the
  pandan/tahini flavor trend — each scored for how well it fits a
  cottage-scale bakery, with sources.
- **6 ready-to-use content templates** derived from those trends/producers,
  each with a hook formula, a shot-by-shot structure, a CTA formula, and a
  sample caption.

None of the above is a substitute for real data — it's a cold-start baseline
so the app isn't empty. The actual point of this tool is `scripts/
apify_ingest.py` (below): pull real posts from real cottage food bakery
Instagram accounts, so `Recommendations` reflects what's actually working
rather than what a handful of hand-picked examples suggest.

## Building a real dataset: `scripts/apify_ingest.py`

Instagram's Terms of Service prohibit automated scraping, and a self-built
scraper that logs in and works around their bot detection is both a ToS
violation and operationally fragile (rate limits, CAPTCHAs, account bans).
This script instead calls [Apify](https://apify.com)'s hosted Instagram
Scraper — a third-party provider whose product is Instagram data collection,
so the scraping mechanics and ToS exposure are theirs, not this codebase's.

**Setup:**
```bash
pip install -r scripts/requirements.txt
cp .env.example .env         # then fill in APIFY_API_TOKEN from your Apify account
```

**Test the pipeline with no API calls and no token** (validates the
normalization/upsert logic against fixture data):
```bash
python scripts/apify_ingest.py --dry-run
```

**Run for real:**
```bash
python scripts/apify_ingest.py --limit-accounts 70 --posts-per-account 15
```
This discovers candidate accounts via cottage-food-specific hashtags
(`#cottagefoodlaw`, `#cottagebakery`, `#homebakerylife`, etc. — see
`DEFAULT_HASHTAGS` in the script to adjust), pulls each account's profile and
recent posts, and upserts them into the same `producers`/`posts` tables the
app already uses — safe to re-run any time to refresh the dataset.

Cost: Apify's official Instagram Scraper bills ~$1.50 per 1,000 posts. A
70-account pull at 15 posts each is ~1,050 posts, roughly **$1.60**, within
Apify's $5/month free tier.

**Two things worth knowing before you run a big pull:**
- **`needs_review` flag**: accounts get kept even if their bio doesn't clearly
  match cottage-food signal keywords, but flagged `needs_review=1` on the
  `producers` row — the hashtag discovery step will catch some commercial
  bakeries and general baking influencers, and the bio filter is a heuristic,
  not ML. Check the flagged rows in the `Producers` view before trusting the
  count.
- **Scraped posts arrive unlabeled**: Instagram's public data gives you real
  engagement numbers (likes, comments, views on Reels) but not *why* a post
  worked — the `hook`/`format_style`/`trend_tag` fields stay empty until
  someone reviews the top-performing posts and codes them. That qualitative
  pass is what actually turns raw numbers into templates; do it via the
  `Posts & Reels` view sorted by engagement, or ask Claude to review a batch
  and propose labels.
- **Sandboxed/restricted environments**: if you're running this from an
  environment with a locked-down network egress policy (as this session's
  environment was when this script was built — `api.apify.com` was blocked
  outright), run it from an unrestricted machine instead, or have your
  environment's network policy updated to allow that host.

## Running it

```bash
pip install -r requirements.txt
python app.py
```

Then open http://localhost:5000 — the database is created and seeded
automatically on first request (SQLite file at `instance/cottage_food.db`,
git-ignored).

To wipe and reseed from scratch:

```bash
export FLASK_APP=app.py
flask init-db      # drops and recreates all tables
flask seed-db       # repopulates with the starter data in seed.py
```

## Project layout

```
app.py                      Flask app: routes, DB access, recommendation engine
schema.sql                  SQLite schema (producers, posts, trends, templates, content_ideas)
seed.py                     Cold-start data (baking-influencer benchmarks + trends + templates)
templates/                  Jinja2 HTML views
static/style.css            Styling
scripts/apify_ingest.py     Real Instagram data pipeline (see above)
scripts/fixtures/           Mock Apify response used by --dry-run
.env.example                Template for APIFY_API_TOKEN (copy to .env, gitignored)
```

## Extending it

- **Track your own posts alongside competitors':** log them in `Posts &
  Reels` with no `producer_id` set — the recommendation engine treats all
  logged posts the same way, so your own results feed the same rankings.
- **New niches beyond bakeries:** the schema has no baking-specific columns
  — `niche` on `producers` and free-text fields elsewhere mean this works
  for any cottage food category (jams, candy, dry mixes, etc.) without
  changes.
- **Automating data entry:** see `scripts/apify_ingest.py` above. To add a
  second data source (a different scraping provider, TikTok, a manual CSV
  export), follow the same pattern — normalize into dicts shaped like the
  `producers`/`posts` columns and upsert using `platform+handle` / `url` as
  the conflict key (see `upsert_producer`/`upsert_post` in that script).
