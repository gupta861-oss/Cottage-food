-- Cottage Bakery Social Media Intelligence -- schema

DROP TABLE IF EXISTS content_ideas;
DROP TABLE IF EXISTS templates;
DROP TABLE IF EXISTS trends;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS producers;

-- Cottage food bakeries/creators you're tracking for inspiration & benchmarking
CREATE TABLE producers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    handle TEXT,
    url TEXT,
    location TEXT,
    niche TEXT,                        -- e.g. "custom cakes", "sourdough", "macarons"
    follower_count INTEGER,
    avg_engagement_rate REAL,          -- percent, self-reported/observed
    posting_frequency_per_week REAL,
    content_style TEXT,                -- short description of their vibe/format mix
    standout_factor TEXT,              -- the ONE thing that makes them work
    source TEXT,                       -- where this info came from
    notes TEXT,
    needs_review INTEGER DEFAULT 0,    -- 1 = ingested but cottage-food match is unconfirmed
    tracked_since TEXT DEFAULT (date('now'))
);

-- Individual posts/reels you've logged, from tracked producers OR your own
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producer_id INTEGER REFERENCES producers(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    content_type TEXT NOT NULL,        -- reel, carousel, photo, story, live
    title TEXT NOT NULL,
    url TEXT,
    posted_date TEXT,
    hook TEXT,                         -- the opening line/visual that grabs attention
    format_style TEXT,                 -- e.g. "process timelapse", "before/after", "POV"
    trend_tag TEXT,                    -- links loosely to trends.name
    hashtags TEXT,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    is_viral INTEGER DEFAULT 0,        -- 1 if it outperformed the account's norm
    why_it_worked TEXT,
    logged_date TEXT DEFAULT (date('now'))
);

-- Trends you're watching across the niche
CREATE TABLE trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    platform TEXT,
    category TEXT,                     -- format, flavor, audio, aesthetic, challenge
    description TEXT,
    first_observed TEXT,
    status TEXT DEFAULT 'rising',      -- rising, peak, declining, evergreen
    niche_fit_score INTEGER DEFAULT 3, -- 1-5, how well it fits cottage bakeries
    example_url TEXT,
    source TEXT,
    notes TEXT
);

-- Reusable, fill-in-the-blank content templates derived from what's working
CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    goal TEXT,                         -- awareness, sales, engagement, trust
    hook_formula TEXT,
    structure_steps TEXT,              -- newline-separated beats/shot list
    cta_formula TEXT,
    based_on_trend_id INTEGER REFERENCES trends(id),
    based_on_producer_id INTEGER REFERENCES producers(id),
    sample_caption TEXT,
    effort_level TEXT,                 -- low, medium, high
    tags TEXT,
    created_date TEXT DEFAULT (date('now'))
);

-- A lightweight content calendar / idea backlog generated from templates
CREATE TABLE content_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER REFERENCES templates(id),
    working_title TEXT NOT NULL,
    target_date TEXT,
    status TEXT DEFAULT 'idea',        -- idea, planned, shot, posted
    notes TEXT,
    created_date TEXT DEFAULT (date('now'))
);

-- Lets ingestion scripts (e.g. scripts/apify_ingest.py) upsert instead of duplicating.
-- Plain (non-partial) unique indexes: SQLite treats NULL as distinct from NULL,
-- so rows with no handle/url still coexist fine without a WHERE clause -- and a
-- plain index is usable as an ON CONFLICT target without repeating a WHERE
-- clause in every upsert statement.
CREATE UNIQUE INDEX IF NOT EXISTS idx_producers_platform_handle ON producers(platform, handle);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_url ON posts(url);
