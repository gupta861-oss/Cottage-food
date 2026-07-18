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

**Engagement rate** = `(likes + comments + shares + saves) / views × 100`.
If you don't have view counts for a post, leave `views` at 0 and it just
won't factor into the ranked lists (rather than showing a misleading number).

## What's pre-loaded

The database seeds itself on first run with:

- **5 real, publicly-documented cottage/home bakers** (Fitwaffle, Ikneadbread,
  Jessi Deily, Deanna Martinez-Bey, Tanya & Mike Clowers) with their
  reported follower counts, content style, and what specifically makes each
  of them work — sourced from public coverage (see the `source` field on
  each producer). Handles/URLs are intentionally left blank where not
  independently verified; confirm before relying on them.
- **7 current (2026) baking-niche trends** — visible filling/texture
  reveals, the cake pop resurgence, wafer paper decorating, sourdough
  scoring, "dump and mix" simplicity recipes, cruffins, and the
  pandan/tahini flavor trend — each scored for how well it fits a
  cottage-scale bakery, with sources.
- **6 ready-to-use content templates** derived from those trends/producers,
  each with a hook formula, a shot-by-shot structure, a CTA formula, and a
  sample caption.
- **3 example posts clearly marked `[EXAMPLE]`** with illustrative (not
  real) engagement numbers, just so the analytics views aren't empty on
  first load. Delete these once you've logged real data — see
  `seed.py` for exactly what they contain and why.

Everything above is a starting point, not a finished dataset. The tool is
only as good as what you keep logging — new producers you find, real posts
you observe (yours or competitors'), and trends as they emerge.

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
app.py              Flask app: routes, DB access, recommendation engine
schema.sql           SQLite schema (producers, posts, trends, templates, content_ideas)
seed.py              Starter data (real researched producers/trends + templates)
templates/           Jinja2 HTML views
static/style.css     Styling
```

## Extending it

- **Track your own posts alongside competitors':** log them in `Posts &
  Reels` with no `producer_id` set — the recommendation engine treats all
  logged posts the same way, so your own results feed the same rankings.
- **New niches beyond bakeries:** the schema has no baking-specific columns
  — `niche` on `producers` and free-text fields elsewhere mean this works
  for any cottage food category (jams, candy, dry mixes, etc.) without
  changes.
- **Automating data entry:** there's no live scraping/API integration by
  design (Instagram/TikTok's terms restrict most scraping, and official
  APIs require app review). If you later get API access, the place to plug
  it in is a script that calls the same `INSERT INTO posts` shape used in
  `seed.py`.
