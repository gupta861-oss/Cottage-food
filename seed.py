"""
Seeds the database with researched starter data: publicly-reported examples of
notable baking accounts, current (2026) baking trends, and a first batch of
content templates derived from them.

The 5 PRODUCERS below are general baking-influencer benchmarks pulled from
public coverage (see the `source` field on each row), not a substitute for a
real cottage-food dataset -- most (Fitwaffle, Ikneadbread) operate at a
commercial-influencer scale, not as licensed home/cottage operators. They're
useful contrast (e.g. "how does a 3M-follower account behave vs. a real
cottage operator"), not the 50-70 account dataset the recommendation engine
needs to find real patterns. For that, run scripts/apify_ingest.py, which
pulls real cottage-food-specific Instagram accounts and their actual post
performance into these same tables -- see README.md.

Follower counts and stylistic notes are pulled from public coverage as of
mid-2026. Handles/URLs are left blank where not independently verified --
confirm before publishing anything based on them.

Run via: flask seed-db  (or it runs automatically on first launch of app.py)
"""

PRODUCERS = [
    dict(
        name="Fitwaffle (Eloise Head)",
        platform="Instagram/TikTok",
        handle=None,
        url=None,
        location="UK",
        niche="easy home baking / dessert recipes",
        follower_count=3000000,
        avg_engagement_rate=None,
        posting_frequency_per_week=5,
        content_style="Fast 'dump and mix' recipe reels: minimal talking, ingredients "
                       "shown up front, single continuous process shot, finished-product "
                       "payoff at the end.",
        standout_factor="Radical simplicity -- recipes look achievable in under 60 seconds, "
                         "which drives saves and shares (not just likes).",
        source="Puratos/Taste Tomorrow: '9 Bakers That Lead the Way on TikTok and Instagram'",
        notes="Reported 3M+ on Instagram and 16M+ combined across TikTok/YouTube. "
              "Useful benchmark for recipe-reel pacing, not a direct cottage-food peer "
              "(scale is much larger) -- study format, not follower envy.",
    ),
    dict(
        name="Ikneadbread",
        platform="Instagram",
        handle=None,
        url=None,
        location=None,
        niche="sourdough / bread scoring art",
        follower_count=189000,
        avg_engagement_rate=None,
        posting_frequency_per_week=3,
        content_style="Macro shots of scored dough transforming in the oven into "
                       "themed crust designs (swirls, animals, seasonal shapes).",
        standout_factor="A single, highly repeatable visual gimmick (crust art) that's "
                         "instantly recognizable and screenshot/save-worthy.",
        source="Puratos/Taste Tomorrow: '9 Bakers That Lead the Way on TikTok and Instagram'",
        notes="Good model for a bread-focused cottage producer: one signature technique, "
              "shown consistently, becomes the account's whole identity.",
    ),
    dict(
        name="Jessi Deily",
        platform="TikTok",
        handle=None,
        url=None,
        location="Helena, MT",
        niche="macarons / decorated meringue cookies",
        follower_count=None,
        avg_engagement_rate=None,
        posting_frequency_per_week=None,
        content_style="Personal-journey storytelling (struggling artist -> cottage baker) "
                       "combined with close-up decorating process content.",
        standout_factor="Narrative arc -- followers are invested in her as a person, "
                         "not just the product, which is a strong fit for cottage-food "
                         "scale operators without paid ad budgets.",
        source="Puratos/Taste Tomorrow: '9 Bakers That Lead the Way on TikTok and Instagram'",
        notes="Directly comparable business type: licensed cottage food operator, not a "
              "commercial bakery. High-value case study.",
    ),
    dict(
        name="Deanna Martinez-Bey",
        platform="Instagram/TikTok",
        handle=None,
        url=None,
        location="Wake Forest, NC",
        niche="cottage bakery + books + pop-ups",
        follower_count=None,
        avg_engagement_rate=None,
        posting_frequency_per_week=None,
        content_style="Multi-format entrepreneur: bakery content interwoven with author/"
                       "educator content and pop-up event promotion.",
        standout_factor="Diversified content pillars (product, education, events) keep "
                         "the feed from feeling like a single repetitive sales pitch.",
        source="Puratos/Taste Tomorrow: '9 Bakers That Lead the Way on TikTok and Instagram'",
        notes="Model for producers who also do markets/pop-ups: use social to promote "
              "IRL touchpoints, not just direct online sales.",
    ),
    dict(
        name="Tanya & Mike Clowers",
        platform="TikTok/Instagram",
        handle=None,
        url=None,
        location="Williamsburg, IA",
        niche="cottage bakery (couple-run)",
        follower_count=None,
        avg_engagement_rate=None,
        posting_frequency_per_week=None,
        content_style="Behind-the-scenes, day-in-the-life content of running a cottage "
                       "bakery as a couple/family operation.",
        standout_factor="Authenticity and relatability -- explicitly credited their rapid "
                         "growth to social media, positioning the couple's story as the hook.",
        source="Puratos/Taste Tomorrow: '9 Bakers That Lead the Way on TikTok and Instagram'",
        notes="Closest direct analog to a small home-based cottage bakery scaling "
              "primarily through organic social.",
    ),
]

TRENDS = [
    dict(
        name="Visible filling / texture reveal",
        platform="TikTok/Instagram Reels",
        category="format",
        description="Cut, pull-apart, or cross-section shots that show off filling, "
                     "layers, or texture contrast (ooze, crunch, pull) as the payoff moment.",
        first_observed="2025",
        status="rising",
        niche_fit_score=5,
        example_url=None,
        source="Bakery&Snacks: 'Top 10 TikTok trends shaping bakery and snacks in 2026'",
        notes="Works for stuffed cookies, filled cakes, cinnamon rolls, croissants -- "
              "almost any cottage bakery product with an interior.",
    ),
    dict(
        name="Cake pops resurgence",
        platform="TikTok",
        category="format",
        description="Cake pops up sharply on menus (+386%), driven by portability, "
                     "portion control, and easy viral recipe/decorating formats.",
        first_observed="2025",
        status="rising",
        niche_fit_score=5,
        example_url=None,
        source="Bakery&Snacks: 'Top 10 TikTok trends shaping bakery and snacks in 2026'",
        notes="Low cost-of-goods, mails/ships well, and decorating process is inherently "
              "video-friendly -- strong fit for cottage-scale production.",
    ),
    dict(
        name="Cruffins / hybrid pastries",
        platform="TikTok/Instagram",
        category="format",
        description="Croissant-muffin hybrids up 224% YoY on menus -- 'elevated quick "
                     "treat' positioning.",
        first_observed="2025",
        status="rising",
        niche_fit_score=3,
        example_url=None,
        source="Bakery&Snacks: 'Top 10 TikTok trends shaping bakery and snacks in 2026'",
        notes="Higher skill/equipment bar; best for producers already doing laminated "
              "dough. Lower fit for a beginner cottage baker.",
    ),
    dict(
        name="Wafer paper cake decorating",
        platform="TikTok",
        category="aesthetic",
        description="Edible wafer paper used for painterly, flower, or translucent "
                     "cake decorating effects -- highly visual, satisfying process shots.",
        first_observed="2025",
        status="rising",
        niche_fit_score=4,
        example_url=None,
        source="Bakery&Snacks: 'Top 10 TikTok trends shaping bakery and snacks in 2026'",
        notes="Strong process-video candidate: application technique is mesmerizing "
              "even before the final reveal.",
    ),
    dict(
        name="Sourdough scoring / crust art",
        platform="Instagram/TikTok",
        category="aesthetic",
        description="Decorative scoring patterns on sourdough that bloom into designs "
                     "during baking.",
        first_observed="2022",
        status="evergreen",
        niche_fit_score=4,
        example_url=None,
        source="Puratos/Taste Tomorrow (Ikneadbread case study)",
        notes="Not new, but consistently reliable -- pairs well with a seasonal design "
              "calendar (holidays, local events).",
    ),
    dict(
        name="'Dump and mix' simplicity recipes",
        platform="TikTok/Instagram Reels",
        category="format",
        description="Recipes framed around extreme ease -- few ingredients, minimal "
                     "steps, fast cuts -- optimized for saves/shares over passive views.",
        first_observed="2023",
        status="evergreen",
        niche_fit_score=4,
        example_url=None,
        source="Puratos/Taste Tomorrow (Fitwaffle case study)",
        notes="Best used for a 'recipe teaser' pillar that drives saves, distinct from "
              "the 'finished product' pillar that drives sales DMs.",
    ),
    dict(
        name="Pandan & tahini flavor trend",
        platform="TikTok/Instagram",
        category="flavor",
        description="Pandan (+47%) and tahini (+95%) showing strong YoY growth as "
                     "flavor callouts driving recipe discovery.",
        first_observed="2025",
        status="rising",
        niche_fit_score=3,
        example_url=None,
        source="Bakery&Snacks: 'Top 10 TikTok trends shaping bakery and snacks in 2026'",
        notes="Good for a limited-time 'flavor drop' content pillar rather than a full "
              "menu change -- lower risk to test trend relevance.",
    ),
]

# NOTE: templates reference trends/producers by *name*; run() resolves the
# actual foreign key ids after inserting the rows above.
TEMPLATES = [
    dict(
        name="Filling Reveal Cut",
        content_type="reel",
        goal="engagement",
        hook_formula="Open on the whole product, knife/hands entering frame within "
                      "the first second -- no talking.",
        structure_steps=(
            "1. 0-1s: whole product, camera static, good light\n"
            "2. 1-3s: cut/pull/break moment in slow motion, filling or texture visible\n"
            "3. 3-5s: close-up of the cross-section, slight camera push-in\n"
            "4. 5-7s: plated/packaged final shot with a hand gesture (pick up, hand off)\n"
            "5. Caption: name the product + one sensory adjective, ask a comment-bait "
            "question (\"crunchy or gooey?\")"
        ),
        cta_formula="Comment your favorite filling / DM 'ORDER' to claim this week's batch.",
        based_on_trend="Visible filling / texture reveal",
        based_on_producer=None,
        sample_caption="This one's stuffed to the edge with brown butter caramel. "
                        "Crunchy top, gooey middle -- team crunchy or team gooey? "
                        "DM 'ORDER' before Thursday's batch sells out.",
        effort_level="low",
        tags="reel,texture,sales",
    ),
    dict(
        name="3-Ingredient Dump & Mix",
        content_type="reel",
        goal="engagement",
        hook_formula="Text overlay: '3 ingredients, no mixer' before any footage plays.",
        structure_steps=(
            "1. 0-1s: ingredients lined up in bowls, overhead shot\n"
            "2. 1-4s: fast-cut dump-and-mix sequence, one continuous motion per cut\n"
            "3. 4-6s: pan/tray going into the oven\n"
            "4. 6-8s: finished product pull, steam/texture visible\n"
            "5. On-screen text lists the 3 ingredients throughout for save-ability"
        ),
        cta_formula="Save this before you forget it / full recipe in bio.",
        based_on_trend="'Dump and mix' simplicity recipes",
        based_on_producer="Fitwaffle (Eloise Head)",
        sample_caption="3 ingredients. No mixer. No excuses. Save this for your next "
                        "lazy-Sunday bake -- and if you'd rather I just make it for you, "
                        "link in bio.",
        effort_level="low",
        tags="reel,recipe,saves",
    ),
    dict(
        name="Cake Pop Speed Run",
        content_type="reel",
        goal="sales",
        hook_formula="Open mid-motion on the dipping step -- most visually satisfying "
                      "beat first, context follows.",
        structure_steps=(
            "1. 0-2s: dipping cake pop into coating, slow rotation for full coverage\n"
            "2. 2-4s: fast-cut montage of decorating multiple pops (sprinkles, drizzle)\n"
            "3. 4-6s: full tray/bouquet of finished pops, styled shot\n"
            "4. 6-7s: packaging into to-go format\n"
            "5. Caption: batch size available + how to order"
        ),
        cta_formula="This week's flavor + order link/DM instructions.",
        based_on_trend="Cake pops resurgence",
        based_on_producer=None,
        sample_caption="This week's flavor: salted caramel cake pops. Made in small "
                        "batches, sold by the half-dozen -- DM to claim yours before "
                        "Friday pickup.",
        effort_level="medium",
        tags="reel,cake-pops,sales,portable",
    ),
    dict(
        name="Scoring Art Timelapse",
        content_type="reel",
        goal="trust",
        hook_formula="Text overlay naming the design ('today's design: ___') over the "
                      "raw scored dough before it goes in the oven.",
        structure_steps=(
            "1. 0-2s: close-up of the scoring pattern being cut into raw dough\n"
            "2. 2-3s: transition/oven door closing\n"
            "3. 3-6s: timelapse of the loaf blooming in the oven (if oven-cam available) "
            "or a jump-cut to the finished bake\n"
            "4. 6-8s: final loaf reveal, natural light, slight rotation\n"
            "5. Caption: name the design + invite requests for next week's pattern"
        ),
        cta_formula="Comment what design you want to see next week.",
        based_on_trend="Sourdough scoring / crust art",
        based_on_producer="Ikneadbread",
        sample_caption="Today's design: wheat stalk, for the first day of the farmers "
                        "market season. What pattern should I try next week?",
        effort_level="medium",
        tags="reel,sourdough,signature-technique",
    ),
    dict(
        name="Behind the Cottage Kitchen",
        content_type="carousel",
        goal="trust",
        hook_formula="Slide 1: a relatable, slightly messy real-kitchen moment with a "
                      "one-line caption hook (not a polished product shot).",
        structure_steps=(
            "1. Slide 1: candid kitchen moment + hook text\n"
            "2. Slide 2-3: process shots (mixing, shaping, decorating)\n"
            "3. Slide 4: a personal note -- why you started, a challenge this week, "
            "a customer story\n"
            "4. Slide 5: current week's product lineup with prices/availability"
        ),
        cta_formula="Follow for weekly menu drops / link in bio to order.",
        based_on_trend=None,
        based_on_producer="Tanya & Mike Clowers",
        sample_caption="Behind the scenes of this week's bake: flour everywhere, two "
                        "kids 'helping', and a new sourdough recipe I almost gave up on "
                        "twice. Here's what's available this Saturday.",
        effort_level="low",
        tags="carousel,bts,community",
    ),
    dict(
        name="Local Flavor Spotlight",
        content_type="photo",
        goal="awareness",
        hook_formula="Lead with the local hook in the first line of the caption "
                      "(neighborhood, market name, or local ingredient source).",
        structure_steps=(
            "1. One high-quality styled photo of the product\n"
            "2. Caption opens with local relevance (e.g. 'made with peaches from "
            "[local farm]' or '[Town] Farmers Market -- Saturday 9-1')\n"
            "3. Include pickup/market location and time clearly\n"
            "4. Use local + niche hashtags together"
        ),
        cta_formula="See you at [market] / order for local pickup by [day].",
        based_on_trend=None,
        based_on_producer=None,
        sample_caption="Made with peaches from Miller's Orchard down the road -- find "
                        "these at the Saturday farmers market, 9-1. #cottagefoodlaw "
                        "#supportlocal #[yourtown]eats",
        effort_level="low",
        tags="photo,local,market,awareness",
    ),
]

CONTENT_IDEAS = [
    dict(
        working_title="Peach filling reveal -- summer market special",
        template_name="Filling Reveal Cut",
        target_date=None,
        notes="Tie to seasonal peach availability; shoot in natural daylight for the cut shot.",
    ),
    dict(
        working_title="3-ingredient no-mixer shortbread",
        template_name="3-Ingredient Dump & Mix",
        target_date=None,
        notes="Good low-effort post for a busy prep week.",
    ),
    dict(
        working_title="This Saturday's market lineup",
        template_name="Local Flavor Spotlight",
        target_date=None,
        notes="Post Thursday evening so it has time to circulate before Saturday market.",
    ),
]


def run(db):
    producer_ids = {}
    for p in PRODUCERS:
        cur = db.execute(
            """INSERT INTO producers
            (name, platform, handle, url, location, niche, follower_count,
             avg_engagement_rate, posting_frequency_per_week, content_style,
             standout_factor, source, notes)
            VALUES (:name,:platform,:handle,:url,:location,:niche,:follower_count,
                    :avg_engagement_rate,:posting_frequency_per_week,:content_style,
                    :standout_factor,:source,:notes)""",
            p,
        )
        producer_ids[p["name"]] = cur.lastrowid

    trend_ids = {}
    for t in TRENDS:
        cur = db.execute(
            """INSERT INTO trends
            (name, platform, category, description, first_observed, status,
             niche_fit_score, example_url, source, notes)
            VALUES (:name,:platform,:category,:description,:first_observed,:status,
                    :niche_fit_score,:example_url,:source,:notes)""",
            t,
        )
        trend_ids[t["name"]] = cur.lastrowid

    template_ids = {}
    for tpl in TEMPLATES:
        cur = db.execute(
            """INSERT INTO templates
            (name, content_type, goal, hook_formula, structure_steps, cta_formula,
             based_on_trend_id, based_on_producer_id, sample_caption, effort_level, tags)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                tpl["name"], tpl["content_type"], tpl["goal"], tpl["hook_formula"],
                tpl["structure_steps"], tpl["cta_formula"],
                trend_ids.get(tpl["based_on_trend"]) if tpl["based_on_trend"] else None,
                producer_ids.get(tpl["based_on_producer"]) if tpl["based_on_producer"] else None,
                tpl["sample_caption"], tpl["effort_level"], tpl["tags"],
            ),
        )
        template_ids[tpl["name"]] = cur.lastrowid

    for idea in CONTENT_IDEAS:
        db.execute(
            "INSERT INTO content_ideas (template_id, working_title, target_date, notes) "
            "VALUES (?,?,?,?)",
            (
                template_ids.get(idea["template_name"]), idea["working_title"],
                idea["target_date"], idea["notes"],
            ),
        )

    db.commit()
