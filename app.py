import os
import sqlite3
import sys
from datetime import date

from flask import Flask, g, redirect, render_template, request, url_for

DB_PATH = os.path.join(os.path.dirname(__file__), "instance", "cottage_food.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

app = Flask(__name__)


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db():
    if "db" not in g:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    with open(SCHEMA_PATH) as f:
        db.executescript(f.read())
    db.commit()
    db.close()


@app.cli.command("init-db")
def init_db_command():
    """Drop and recreate all tables (destructive)."""
    init_db()
    print("Database initialized at", DB_PATH)


@app.cli.command("seed-db")
def seed_db_command():
    """Populate the database with researched starter data."""
    import seed
    seed.run(get_db_standalone())
    print("Database seeded.")


DATASET_PATH = os.path.join(os.path.dirname(__file__), "data", "cottage_bakery_dataset.json")


def _load_real_dataset():
    """Loads data/cottage_bakery_dataset.json (the real, gathered dataset --
    see scripts/export_dataset.py / scripts/load_dataset.py) if it exists."""
    if not os.path.exists(DATASET_PATH):
        return False
    scripts_dir = os.path.join(os.path.dirname(__file__), "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    import load_dataset
    load_dataset.load()
    return True


@app.cli.command("load-dataset")
def load_dataset_command():
    """Load the real gathered dataset from data/cottage_bakery_dataset.json."""
    if _load_real_dataset():
        print("Dataset loaded.")
    else:
        print(f"No dataset file at {DATASET_PATH} -- nothing to load.")


def get_db_standalone():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def ensure_db_ready():
    """First-run convenience: create + seed the db if it doesn't exist yet, then
    layer in the real gathered dataset (data/cottage_bakery_dataset.json) on
    top if one has been committed -- so a fresh clone shows real data, not
    just the cold-start benchmarks, without an extra manual step."""
    if not os.path.exists(DB_PATH):
        init_db()
        import seed
        db = get_db_standalone()
        seed.run(db)
        db.commit()
        db.close()
        _load_real_dataset()


# ---------------------------------------------------------------------------
# Analytics / recommendation engine
# ---------------------------------------------------------------------------

def engagement_rate(row):
    """% engagement relative to views. Instagram doesn't expose view counts for
    photo/carousel posts (only Reels), so when views are missing we fall back to
    engagement relative to the producer's follower count -- the standard proxy
    used for feed-post engagement rate. Returns 0 only when neither is available."""
    interactions = (row["likes"] or 0) + (row["comments"] or 0) + (row["shares"] or 0) + (row["saves"] or 0)
    views = row["views"] or 0
    if views > 0:
        return round((interactions / views) * 100, 2)
    followers = row["follower_count"] if "follower_count" in row.keys() else None
    if followers:
        return round((interactions / followers) * 100, 2)
    return 0.0


def posts_with_rates(db, where="", params=()):
    rows = db.execute(
        f"""
        SELECT posts.*, producers.name AS producer_name, producers.niche AS producer_niche,
               producers.follower_count AS follower_count
        FROM posts
        LEFT JOIN producers ON producers.id = posts.producer_id
        {where}
        ORDER BY posts.posted_date DESC
        """,
        params,
    ).fetchall()
    enriched = []
    for r in rows:
        d = dict(r)
        d["engagement_rate"] = engagement_rate(r)
        enriched.append(d)
    return enriched


def build_recommendations(db):
    posts = posts_with_rates(db)
    trends = [dict(r) for r in db.execute("SELECT * FROM trends ORDER BY niche_fit_score DESC, status ASC").fetchall()]
    templates_ = [dict(r) for r in db.execute("SELECT * FROM templates").fetchall()]

    def avg_by(key):
        buckets = {}
        for p in posts:
            k = p.get(key)
            if not k:
                continue
            buckets.setdefault(k, []).append(p["engagement_rate"])
        ranked = [
            {"key": k, "avg_engagement": round(sum(v) / len(v), 2), "sample_size": len(v)}
            for k, v in buckets.items()
        ]
        ranked.sort(key=lambda x: x["avg_engagement"], reverse=True)
        return ranked

    top_content_types = avg_by("content_type")
    top_hooks = avg_by("hook")
    top_formats = avg_by("format_style")
    top_trend_tags = avg_by("trend_tag")

    rising_trends = [t for t in trends if t["status"] == "rising" and t["niche_fit_score"] >= 4]

    covered_trend_ids = {t["based_on_trend_id"] for t in templates_ if t["based_on_trend_id"]}
    trend_gaps = [t for t in rising_trends if t["id"] not in covered_trend_ids]

    template_content_types = {t["content_type"] for t in templates_}
    post_content_types = {p["content_type"] for p in posts if p["content_type"]}
    format_gaps = sorted(post_content_types - template_content_types)

    viral_posts = sorted(
        [p for p in posts if p["is_viral"] or p["engagement_rate"] >= 8],
        key=lambda p: p["engagement_rate"],
        reverse=True,
    )[:6]

    return {
        "top_content_types": top_content_types,
        "top_hooks": top_hooks,
        "top_formats": top_formats,
        "top_trend_tags": top_trend_tags,
        "rising_trends": rising_trends,
        "trend_gaps": trend_gaps,
        "format_gaps": format_gaps,
        "viral_posts": viral_posts,
        "producer_count": db.execute("SELECT COUNT(*) c FROM producers").fetchone()["c"],
        "post_count": len(posts),
        "template_count": len(templates_),
    }


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@app.route("/")
def dashboard():
    ensure_db_ready()
    db = get_db()
    rec = build_recommendations(db)
    recent_ideas = db.execute(
        "SELECT content_ideas.*, templates.name AS template_name FROM content_ideas "
        "LEFT JOIN templates ON templates.id = content_ideas.template_id "
        "ORDER BY content_ideas.created_date DESC LIMIT 5"
    ).fetchall()
    return render_template("dashboard.html", rec=rec, recent_ideas=recent_ideas)


# ---------------------------------------------------------------------------
# Producers
# ---------------------------------------------------------------------------

@app.route("/producers")
def producers_list():
    ensure_db_ready()
    db = get_db()
    producers = db.execute("SELECT * FROM producers ORDER BY name").fetchall()
    return render_template("producers.html", producers=producers)


@app.route("/producers/new", methods=["GET", "POST"])
def producer_new():
    ensure_db_ready()
    db = get_db()
    if request.method == "POST":
        f = request.form
        db.execute(
            """INSERT INTO producers
            (name, platform, handle, url, location, niche, follower_count,
             avg_engagement_rate, posting_frequency_per_week, content_style,
             standout_factor, source, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                f["name"], f["platform"], f.get("handle"), f.get("url"), f.get("location"),
                f.get("niche"), f.get("follower_count") or None, f.get("avg_engagement_rate") or None,
                f.get("posting_frequency_per_week") or None, f.get("content_style"),
                f.get("standout_factor"), f.get("source"), f.get("notes"),
            ),
        )
        db.commit()
        return redirect(url_for("producers_list"))
    return render_template("producer_form.html", producer=None)


@app.route("/producers/<int:producer_id>")
def producer_detail(producer_id):
    db = get_db()
    producer = db.execute("SELECT * FROM producers WHERE id=?", (producer_id,)).fetchone()
    posts = posts_with_rates(db, "WHERE posts.producer_id=?", (producer_id,))
    return render_template("producer_detail.html", producer=producer, posts=posts)


@app.route("/producers/<int:producer_id>/edit", methods=["GET", "POST"])
def producer_edit(producer_id):
    db = get_db()
    producer = db.execute("SELECT * FROM producers WHERE id=?", (producer_id,)).fetchone()
    if request.method == "POST":
        f = request.form
        db.execute(
            """UPDATE producers SET name=?, platform=?, handle=?, url=?, location=?, niche=?,
               follower_count=?, avg_engagement_rate=?, posting_frequency_per_week=?,
               content_style=?, standout_factor=?, source=?, notes=? WHERE id=?""",
            (
                f["name"], f["platform"], f.get("handle"), f.get("url"), f.get("location"),
                f.get("niche"), f.get("follower_count") or None, f.get("avg_engagement_rate") or None,
                f.get("posting_frequency_per_week") or None, f.get("content_style"),
                f.get("standout_factor"), f.get("source"), f.get("notes"), producer_id,
            ),
        )
        db.commit()
        return redirect(url_for("producer_detail", producer_id=producer_id))
    return render_template("producer_form.html", producer=producer)


@app.route("/producers/<int:producer_id>/delete", methods=["POST"])
def producer_delete(producer_id):
    db = get_db()
    db.execute("DELETE FROM producers WHERE id=?", (producer_id,))
    db.commit()
    return redirect(url_for("producers_list"))


# ---------------------------------------------------------------------------
# Posts
# ---------------------------------------------------------------------------

@app.route("/posts")
def posts_list():
    ensure_db_ready()
    db = get_db()
    content_type = request.args.get("content_type")
    viral_only = request.args.get("viral") == "1"
    where_clauses = []
    params = []
    if content_type:
        where_clauses.append("posts.content_type = ?")
        params.append(content_type)
    if viral_only:
        where_clauses.append("posts.is_viral = 1")
    where = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    posts = posts_with_rates(db, where, tuple(params))
    posts.sort(key=lambda p: p["engagement_rate"], reverse=True)
    content_types = [r["content_type"] for r in db.execute("SELECT DISTINCT content_type FROM posts").fetchall()]
    return render_template("posts.html", posts=posts, content_types=content_types,
                            active_type=content_type, viral_only=viral_only)


@app.route("/posts/new", methods=["GET", "POST"])
def post_new():
    ensure_db_ready()
    db = get_db()
    producers = db.execute("SELECT id, name FROM producers ORDER BY name").fetchall()
    if request.method == "POST":
        f = request.form
        db.execute(
            """INSERT INTO posts
            (producer_id, platform, content_type, title, url, posted_date, hook,
             format_style, trend_tag, hashtags, likes, comments, shares, saves, views,
             is_viral, why_it_worked)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                f.get("producer_id") or None, f["platform"], f["content_type"], f["title"],
                f.get("url"), f.get("posted_date"), f.get("hook"), f.get("format_style"),
                f.get("trend_tag"), f.get("hashtags"),
                int(f.get("likes") or 0), int(f.get("comments") or 0), int(f.get("shares") or 0),
                int(f.get("saves") or 0), int(f.get("views") or 0),
                1 if f.get("is_viral") == "on" else 0, f.get("why_it_worked"),
            ),
        )
        db.commit()
        return redirect(url_for("posts_list"))
    return render_template("post_form.html", producers=producers)


@app.route("/posts/<int:post_id>/delete", methods=["POST"])
def post_delete(post_id):
    db = get_db()
    db.execute("DELETE FROM posts WHERE id=?", (post_id,))
    db.commit()
    return redirect(url_for("posts_list"))


# ---------------------------------------------------------------------------
# Trends
# ---------------------------------------------------------------------------

@app.route("/trends")
def trends_list():
    ensure_db_ready()
    db = get_db()
    trends = db.execute("SELECT * FROM trends ORDER BY niche_fit_score DESC, status").fetchall()
    return render_template("trends.html", trends=trends)


@app.route("/trends/new", methods=["GET", "POST"])
def trend_new():
    ensure_db_ready()
    db = get_db()
    if request.method == "POST":
        f = request.form
        db.execute(
            """INSERT INTO trends (name, platform, category, description, first_observed,
               status, niche_fit_score, example_url, source, notes)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                f["name"], f.get("platform"), f.get("category"), f.get("description"),
                f.get("first_observed"), f.get("status") or "rising",
                int(f.get("niche_fit_score") or 3), f.get("example_url"), f.get("source"),
                f.get("notes"),
            ),
        )
        db.commit()
        return redirect(url_for("trends_list"))
    return render_template("trend_form.html")


@app.route("/trends/<int:trend_id>/delete", methods=["POST"])
def trend_delete(trend_id):
    db = get_db()
    db.execute("DELETE FROM trends WHERE id=?", (trend_id,))
    db.commit()
    return redirect(url_for("trends_list"))


# ---------------------------------------------------------------------------
# Templates (content templates library)
# ---------------------------------------------------------------------------

@app.route("/templates-library")
def templates_list():
    ensure_db_ready()
    db = get_db()
    templates_ = db.execute(
        """SELECT templates.*, trends.name AS trend_name, producers.name AS producer_name
           FROM templates
           LEFT JOIN trends ON trends.id = templates.based_on_trend_id
           LEFT JOIN producers ON producers.id = templates.based_on_producer_id
           ORDER BY templates.created_date DESC"""
    ).fetchall()
    return render_template("templates_library.html", templates=templates_)


@app.route("/templates-library/<int:template_id>")
def template_detail(template_id):
    db = get_db()
    t = db.execute(
        """SELECT templates.*, trends.name AS trend_name, producers.name AS producer_name
           FROM templates
           LEFT JOIN trends ON trends.id = templates.based_on_trend_id
           LEFT JOIN producers ON producers.id = templates.based_on_producer_id
           WHERE templates.id=?""",
        (template_id,),
    ).fetchone()
    return render_template("template_detail.html", t=t)


@app.route("/templates-library/new", methods=["GET", "POST"])
def template_new():
    ensure_db_ready()
    db = get_db()
    trends = db.execute("SELECT id, name FROM trends ORDER BY name").fetchall()
    producers = db.execute("SELECT id, name FROM producers ORDER BY name").fetchall()
    if request.method == "POST":
        f = request.form
        db.execute(
            """INSERT INTO templates
            (name, content_type, goal, hook_formula, structure_steps, cta_formula,
             based_on_trend_id, based_on_producer_id, sample_caption, effort_level, tags)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                f["name"], f["content_type"], f.get("goal"), f.get("hook_formula"),
                f.get("structure_steps"), f.get("cta_formula"),
                f.get("based_on_trend_id") or None, f.get("based_on_producer_id") or None,
                f.get("sample_caption"), f.get("effort_level"), f.get("tags"),
            ),
        )
        db.commit()
        return redirect(url_for("templates_list"))
    return render_template("template_form.html", trends=trends, producers=producers)


@app.route("/templates-library/<int:template_id>/delete", methods=["POST"])
def template_delete(template_id):
    db = get_db()
    db.execute("DELETE FROM templates WHERE id=?", (template_id,))
    db.commit()
    return redirect(url_for("templates_list"))


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------

@app.route("/recommendations")
def recommendations():
    ensure_db_ready()
    db = get_db()
    rec = build_recommendations(db)
    return render_template("recommendations.html", rec=rec)


# ---------------------------------------------------------------------------
# Content ideas / calendar
# ---------------------------------------------------------------------------

@app.route("/ideas")
def ideas_list():
    ensure_db_ready()
    db = get_db()
    ideas = db.execute(
        """SELECT content_ideas.*, templates.name AS template_name
           FROM content_ideas
           LEFT JOIN templates ON templates.id = content_ideas.template_id
           ORDER BY CASE status
             WHEN 'idea' THEN 0 WHEN 'planned' THEN 1 WHEN 'shot' THEN 2 ELSE 3 END,
             content_ideas.target_date"""
    ).fetchall()
    templates_ = db.execute("SELECT id, name FROM templates ORDER BY name").fetchall()
    return render_template("ideas.html", ideas=ideas, templates=templates_)


@app.route("/ideas/new", methods=["POST"])
def idea_new():
    db = get_db()
    f = request.form
    db.execute(
        "INSERT INTO content_ideas (template_id, working_title, target_date, notes) VALUES (?,?,?,?)",
        (f.get("template_id") or None, f["working_title"], f.get("target_date"), f.get("notes")),
    )
    db.commit()
    return redirect(url_for("ideas_list"))


@app.route("/ideas/<int:idea_id>/status", methods=["POST"])
def idea_status(idea_id):
    db = get_db()
    db.execute("UPDATE content_ideas SET status=? WHERE id=?", (request.form["status"], idea_id))
    db.commit()
    return redirect(url_for("ideas_list"))


@app.route("/ideas/<int:idea_id>/delete", methods=["POST"])
def idea_delete(idea_id):
    db = get_db()
    db.execute("DELETE FROM content_ideas WHERE id=?", (idea_id,))
    db.commit()
    return redirect(url_for("ideas_list"))


if __name__ == "__main__":
    ensure_db_ready()
    app.run(debug=True, host="0.0.0.0", port=5000)
