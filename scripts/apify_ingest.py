"""
Pulls real Instagram data for cottage food bakery accounts via Apify's hosted
Instagram Scraper (https://apify.com/apify/instagram-scraper) and loads it into
the same producers/posts tables the Flask app (../app.py) already uses.

Why Apify and not a self-built scraper: Instagram's Terms of Service prohibit
automated data collection, and a self-built scraper that logs in and works around
their bot detection is both a ToS violation and operationally fragile (rate
limits, CAPTCHAs, account bans). Apify is a specialized provider that owns that
scraping/ToS surface; this script only talks to Apify's own API, never to
Instagram directly.

Talks to Apify's REST API directly via `requests` rather than the official
`apify-client` SDK -- the SDK's default HTTP backend (`impit`, a Rust client
that does browser-like TLS fingerprinting) failed to negotiate through this
project's sandboxed proxy setup in testing (connection reset at the TCP/TLS
layer, even with the proxy explicitly configured), while plain `requests`
worked without issue. If you hit connection errors running this outside a
proxied sandbox, that's unrelated and worth reporting separately.

Field mapping below was verified against apify/instagram-scraper's actual
published input schema (fetched live via GET /v2/acts/apify~instagram-scraper
and its build's inputSchema) as of mid-2026, not guessed from docs alone. If
Apify changes the actor's schema later, re-check with the same GET call before
trusting a big pull.

Usage:
    pip install -r scripts/requirements.txt
    export APIFY_API_TOKEN=...          # from your Apify account, never commit this
    python scripts/apify_ingest.py --limit-accounts 70 --posts-per-account 15

    # Test the normalization/upsert logic with no API calls and no token:
    python scripts/apify_ingest.py --dry-run
"""
import argparse
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "instance" / "cottage_food.db"
SCHEMA_PATH = REPO_ROOT / "schema.sql"
FIXTURE_PATH = Path(__file__).resolve().parent / "fixtures" / "sample_apify_response.json"

INSTAGRAM_SCRAPER_ACTOR_ID = "apify~instagram-scraper"
APIFY_API_BASE = "https://api.apify.com/v2"
RUN_SYNC_TIMEOUT_SECS = 280  # Apify's run-sync-get-dataset-items endpoint caps around 300s

# Starter hashtags used for discovery. Cottage food operators consistently tag
# their state's cottage food law and/or "cottage bakery" / "home bakery" --
# these are chosen to bias toward licensed home operators, not commercial-scale
# bakeries or general baking influencers.
DEFAULT_HASHTAGS = [
    "cottagefoodlaw",
    "cottagebakery",
    "cottagefoodbusiness",
    "homebakerylife",
    "licensedcottagefood",
    "homebasedbakery",
    "cottagefoodbaker",
]

# Bio keyword heuristic for the cottage-food filter. Not ML -- just a first
# pass. Anything that doesn't match gets kept but flagged needs_review=1 so a
# human confirms it before it counts toward your target account count.
COTTAGE_FOOD_KEYWORDS = [
    "cottage food", "cottage bakery", "cottage baker", "home bakery",
    "home-based bakery", "homebased bakery", "licensed cottage",
    "cottage food law", "cottage food business", "home baker",
]


def load_dotenv_if_present():
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_token():
    token = os.environ.get("APIFY_API_TOKEN")
    if not token:
        sys.exit(
            "APIFY_API_TOKEN is not set. Get one from your Apify account "
            "(https://apify.com) and either `export APIFY_API_TOKEN=...` or "
            "put it in a .env file (see .env.example). Not needed for --dry-run."
        )
    return token


def call_actor_sync(token, run_input):
    """Runs the Instagram Scraper actor and returns its dataset items directly,
    via Apify's synchronous run-sync-get-dataset-items endpoint (avoids manually
    starting a run and polling for completion)."""
    url = f"{APIFY_API_BASE}/acts/{INSTAGRAM_SCRAPER_ACTOR_ID}/run-sync-get-dataset-items"
    resp = requests.post(
        url,
        params={"token": token, "timeout": RUN_SYNC_TIMEOUT_SECS},
        json=run_input,
        timeout=RUN_SYNC_TIMEOUT_SECS + 20,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Apify actor call failed ({resp.status_code}): {resp.text[:500]}")
    return resp.json()


def is_cottage_food_bio(bio):
    if not bio:
        return False
    bio_lower = bio.lower()
    return any(kw in bio_lower for kw in COTTAGE_FOOD_KEYWORDS)


def classify_content_type(item):
    """Maps Apify's post-type fields to our content_type vocabulary. Verified
    against live output: Reels come back as type="Video", productType="clips"
    (not e.g. an isVideo boolean); regular carousels are type="Sidecar",
    productType="carousel_container"; single photos are type="Image",
    productType="feed"."""
    raw_type = (item.get("type") or "").lower()
    product_type = (item.get("productType") or "").lower()
    if raw_type == "video" or "clip" in product_type or "reel" in product_type \
            or item.get("videoPlayCount") or item.get("videoViewCount"):
        return "reel"
    if raw_type == "sidecar" or "carousel" in product_type or item.get("childPosts"):
        return "carousel"
    return "photo"


def first_line(text, max_len=140):
    if not text:
        return None
    line = text.strip().split("\n")[0].strip()
    return line[:max_len]


def extract_hashtags(item):
    """The actor already returns a parsed `hashtags` list (no # prefix) on post
    items -- prefer that over regex-parsing the caption ourselves."""
    tags = item.get("hashtags")
    if tags:
        return ",".join(f"#{t}" for t in tags)
    caption = item.get("caption") or item.get("text")
    if not caption:
        return None
    found = re.findall(r"#(\w+)", caption)
    return ",".join(f"#{t}" for t in found) if found else None


def normalize_profile_item(item):
    """item = one 'details' result from the Instagram Scraper actor."""
    username = item.get("username") or item.get("ownerUsername")
    bio = item.get("biography") or item.get("bio") or ""
    return {
        "name": item.get("fullName") or username,
        "platform": "Instagram",
        "handle": f"@{username}" if username else None,
        "url": item.get("url") or (f"https://www.instagram.com/{username}/" if username else None),
        "follower_count": item.get("followersCount") or item.get("followers"),
        "content_style": bio or None,
        "source": "Apify Instagram Scraper (apify/instagram-scraper)",
        "needs_review": 0 if is_cottage_food_bio(bio) else 1,
        "notes": f"Ingested via scripts/apify_ingest.py. Bio: {bio}" if bio else "Ingested via scripts/apify_ingest.py.",
    }


def normalize_post_item(item):
    """item = one 'posts' result from the Instagram Scraper actor."""
    caption = item.get("caption") or item.get("text")
    likes = item.get("likesCount") or item.get("likes") or 0
    comments = item.get("commentsCount") or item.get("comments") or 0
    views = item.get("videoViewCount") or item.get("videoPlayCount") or item.get("views") or 0
    return {
        "platform": "Instagram",
        "content_type": classify_content_type(item),
        "title": first_line(caption) or "(no caption)",
        "url": item.get("url"),
        "posted_date": (item.get("timestamp") or "")[:10] or None,
        "hashtags": extract_hashtags(item),
        "likes": likes,
        "comments": comments,
        "shares": 0,   # not publicly exposed by Instagram
        "saves": 0,    # not publicly exposed by Instagram
        "views": views,
        "why_it_worked": None,  # filled in later by the manual classification pass
    }


# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------

def get_db():
    fresh = not DB_PATH.exists()
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    if fresh:
        db.executescript(SCHEMA_PATH.read_text())
        db.commit()
    return db


def upsert_producer(db, profile):
    if not profile.get("handle"):
        raise ValueError("Cannot upsert a producer with no handle")
    db.execute(
        """INSERT INTO producers (name, platform, handle, url, follower_count,
               content_style, source, needs_review, notes)
           VALUES (:name, :platform, :handle, :url, :follower_count,
               :content_style, :source, :needs_review, :notes)
           ON CONFLICT(platform, handle) DO UPDATE SET
               name=excluded.name, url=excluded.url,
               follower_count=excluded.follower_count,
               content_style=excluded.content_style,
               needs_review=excluded.needs_review, notes=excluded.notes""",
        profile,
    )
    row = db.execute(
        "SELECT id FROM producers WHERE platform=? AND handle=?",
        (profile["platform"], profile["handle"]),
    ).fetchone()
    return row["id"]


def upsert_post(db, producer_id, post):
    post = dict(post, producer_id=producer_id)
    if post.get("url"):
        db.execute(
            """INSERT INTO posts (producer_id, platform, content_type, title, url,
                   posted_date, hashtags, likes, comments, shares, saves, views, why_it_worked)
               VALUES (:producer_id, :platform, :content_type, :title, :url,
                   :posted_date, :hashtags, :likes, :comments, :shares, :saves, :views, :why_it_worked)
               ON CONFLICT(url) DO UPDATE SET
                   likes=excluded.likes, comments=excluded.comments,
                   views=excluded.views, title=excluded.title""",
            post,
        )
    else:
        db.execute(
            """INSERT INTO posts (producer_id, platform, content_type, title, url,
                   posted_date, hashtags, likes, comments, shares, saves, views, why_it_worked)
               VALUES (:producer_id, :platform, :content_type, :title, :url,
                   :posted_date, :hashtags, :likes, :comments, :shares, :saves, :views, :why_it_worked)""",
            post,
        )


# ---------------------------------------------------------------------------
# Apify calls
# ---------------------------------------------------------------------------

def discover_usernames(token, hashtags, limit):
    """Pulls each hashtag's explore page directly (directUrls to
    instagram.com/explore/tags/<tag>/) and collects poster usernames from the
    returned posts as discovery candidates. NOTE: the actor's documented
    `search` + `searchType: hashtag` input was tested live and returned
    "no_items" for both a niche tag and a huge one (#sourdough) -- it appears
    non-functional right now, so this uses the directUrls form instead, which
    was verified working against real data."""
    usernames = []
    seen = set()
    per_hashtag_limit = max(20, (limit * 2) // max(len(hashtags), 1))
    for hashtag in hashtags:
        if len(usernames) >= limit:
            break
        run_input = {
            "directUrls": [f"https://www.instagram.com/explore/tags/{hashtag}/"],
            "resultsType": "posts",
            "resultsLimit": per_hashtag_limit,
        }
        try:
            items = call_actor_sync(token, run_input)
        except RuntimeError as e:
            print(f"  discovery for #{hashtag} failed: {e}")
            continue
        for item in items:
            username = item.get("ownerUsername") or item.get("username")
            if username and username not in seen:
                seen.add(username)
                usernames.append(username)
            if len(usernames) >= limit:
                break
    return usernames


def fetch_profile_and_posts(token, username, posts_per_account):
    profile_url = f"https://www.instagram.com/{username}/"

    details = call_actor_sync(token, {
        "directUrls": [profile_url],
        "resultsType": "details",
        "resultsLimit": 1,
    })
    profile_item = details[0] if details else {"username": username}

    post_items = call_actor_sync(token, {
        "directUrls": [profile_url],
        "resultsType": "posts",
        "resultsLimit": posts_per_account,
    })
    return profile_item, post_items


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def run_dry_run(db):
    data = json.loads(FIXTURE_PATH.read_text())
    added_producers, added_posts, flagged = 0, 0, 0
    for account in data["accounts"]:
        profile = normalize_profile_item(account["profile"])
        if profile["needs_review"]:
            flagged += 1
        producer_id = upsert_producer(db, profile)
        added_producers += 1
        for raw_post in account["posts"]:
            upsert_post(db, producer_id, normalize_post_item(raw_post))
            added_posts += 1
    db.commit()
    print(f"[dry-run] upserted {added_producers} producers ({flagged} flagged needs_review), "
          f"{added_posts} posts from fixture data.")


def run_live(db, hashtags, usernames, limit_accounts, posts_per_account):
    token = get_token()
    print(f"Discovering candidate accounts from hashtags: {', '.join(hashtags)} ...")
    discovered = discover_usernames(token, hashtags, limit_accounts)
    all_usernames = list(dict.fromkeys(usernames + discovered))[:limit_accounts]
    print(f"Found {len(all_usernames)} candidate accounts.\n")

    added_producers, added_posts, flagged = 0, 0, 0
    for username in all_usernames:
        print(f"Fetching @{username} ...")
        try:
            profile_item, post_items = fetch_profile_and_posts(token, username, posts_per_account)
        except RuntimeError as e:
            print(f"  skipped @{username}: {e}")
            continue
        profile = normalize_profile_item(profile_item)
        if not profile["handle"]:
            print(f"  skipped @{username}: no handle resolved")
            continue
        if profile["needs_review"]:
            flagged += 1
        producer_id = upsert_producer(db, profile)
        added_producers += 1
        for raw_post in post_items:
            upsert_post(db, producer_id, normalize_post_item(raw_post))
            added_posts += 1
        db.commit()

    print(f"\nDone. Upserted {added_producers} producers ({flagged} flagged needs_review "
          f"-- review these in the app before counting them toward your target), "
          f"{added_posts} posts.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hashtags", default=",".join(DEFAULT_HASHTAGS),
                         help="Comma-separated hashtags to search for discovery (no # prefix)")
    parser.add_argument("--usernames", default="",
                         help="Comma-separated Instagram usernames to include explicitly, in addition to discovery")
    parser.add_argument("--limit-accounts", type=int, default=70)
    parser.add_argument("--posts-per-account", type=int, default=15)
    parser.add_argument("--dry-run", action="store_true",
                         help="Use local fixture data instead of calling Apify (no token needed)")
    args = parser.parse_args()

    load_dotenv_if_present()
    db = get_db()

    if args.dry_run:
        run_dry_run(db)
    else:
        hashtags = [h.strip() for h in args.hashtags.split(",") if h.strip()]
        usernames = [u.strip().lstrip("@") for u in args.usernames.split(",") if u.strip()]
        run_live(db, hashtags, usernames, args.limit_accounts, args.posts_per_account)

    db.close()


if __name__ == "__main__":
    main()
