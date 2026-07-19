"""
Exports the current producers/posts tables to data/cottage_bakery_dataset.json --
a durable, git-tracked snapshot of whatever real data has been gathered, since
instance/cottage_food.db itself is gitignored (SQLite files don't diff/review
well in git).

Run this after any scripts/apify_ingest.py pull (and any manual cleanup/review
you do afterward) to persist the result. Re-running overwrites the previous
snapshot -- if you want to keep history, that's what git log on the JSON file
is for.

Usage:
    python scripts/export_dataset.py
    python scripts/export_dataset.py --out data/some_other_name.json
"""
import argparse
import datetime
import json
import sqlite3
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "instance" / "cottage_food.db"
DEFAULT_OUT = REPO_ROOT / "data" / "cottage_bakery_dataset.json"


def export(db_path=DB_PATH, out_path=DEFAULT_OUT):
    if not db_path.exists():
        raise SystemExit(f"No database at {db_path} -- nothing to export.")

    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row

    producers = [dict(r) for r in db.execute("SELECT * FROM producers ORDER BY id")]
    posts = [dict(r) for r in db.execute("SELECT * FROM posts ORDER BY id")]
    db.close()

    payload = {
        "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "description": (
            "Real cottage-food bakery Instagram accounts and posts, gathered via "
            "scripts/apify_ingest.py (Apify's hosted Instagram Scraper) and "
            "manually reviewed to remove non-bakery accounts pulled in by hashtag "
            "discovery noise (tools, farmers markets, institutions, agencies, "
            "consultants, food blogs, etc.) and to correct bio-keyword-filter "
            "misses. producers[].id / posts[].producer_id are export-local "
            "references (re-linked on load, not real DB ids) -- see "
            "scripts/load_dataset.py."
        ),
        "producer_count": len(producers),
        "post_count": len(posts),
        "producers": producers,
        "posts": posts,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"Exported {len(producers)} producers and {len(posts)} posts to {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(DB_PATH))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()
    export(Path(args.db), Path(args.out))
