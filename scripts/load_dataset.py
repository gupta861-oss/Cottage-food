"""
Loads data/cottage_bakery_dataset.json (the git-tracked snapshot of gathered
real data) into instance/cottage_food.db -- the reverse of export_dataset.py.

Use this to reconstitute the curated dataset (44 real cottage-food bakery
accounts and their posts, as of the last export) on a fresh checkout, without
re-running scripts/apify_ingest.py and re-paying for/re-reviewing a new pull.

Reuses upsert_producer/upsert_post from apify_ingest.py so loaded rows follow
the exact same de-dup rules (platform+handle, url) as a live scrape would.

Usage:
    python scripts/load_dataset.py
    python scripts/load_dataset.py --file data/some_other_name.json
"""
import argparse
import json
from pathlib import Path

from apify_ingest import DB_PATH, get_db, upsert_post, upsert_producer

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_IN = REPO_ROOT / "data" / "cottage_bakery_dataset.json"

PRODUCER_FIELDS = [
    "name", "platform", "handle", "url", "location", "niche", "follower_count",
    "avg_engagement_rate", "posting_frequency_per_week", "content_style",
    "standout_factor", "source", "notes", "needs_review",
]
POST_FIELDS = [
    "platform", "content_type", "title", "url", "posted_date", "hook",
    "format_style", "trend_tag", "hashtags", "likes", "comments", "shares",
    "saves", "views", "is_viral", "why_it_worked",
]


def load(in_path=DEFAULT_IN):
    if not in_path.exists():
        raise SystemExit(f"No dataset file at {in_path}")

    payload = json.loads(in_path.read_text())
    db = get_db()

    id_map = {}
    for p in payload["producers"]:
        profile = {field: p.get(field) for field in PRODUCER_FIELDS}
        # upsert_producer requires needs_review to be present even if 0/None
        profile["needs_review"] = profile.get("needs_review") or 0
        new_id = upsert_producer(db, profile)
        id_map[p["id"]] = new_id
    db.commit()

    post_count = 0
    for post in payload["posts"]:
        old_producer_id = post.get("producer_id")
        new_producer_id = id_map.get(old_producer_id) if old_producer_id else None
        row = {field: post.get(field) for field in POST_FIELDS}
        upsert_post(db, new_producer_id, row)
        post_count += 1
    db.commit()
    db.close()

    print(f"Loaded {len(payload['producers'])} producers and {post_count} posts "
          f"into {DB_PATH} (dataset exported {payload.get('exported_at', 'unknown time')}).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", default=str(DEFAULT_IN))
    args = parser.parse_args()
    load(Path(args.file))
