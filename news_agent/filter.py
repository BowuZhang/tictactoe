from datetime import datetime, timedelta, timezone

WESTCHESTER_TERMS = [
    "westchester", "yonkers", "white plains", "new rochelle", "mount vernon",
    "scarsdale", "tarrytown", "sleepy hollow", "ossining", "peekskill",
    "port chester", "harrison", "mamaroneck", "larchmont", "bronxville",
    "tuckahoe", "elmsford", "dobbs ferry", "ardsley", "rye", "pelham",
]

TOPIC_TERMS = [
    # kids / family
    "kids", "children", "child", "family", "families", "youth", "teen", "teenager",
    "baby", "toddler", "daycare", "after school", "summer camp",
    # education
    "school", "education", "students", "teacher", "classroom", "district",
    "principal", "graduation", "college", "university", "homework", "tuition",
    # traffic / transportation
    "traffic", "road", "highway", "i-287", "i-87", "tappan zee", "mario cuomo bridge",
    "construction", "detour", "accident", "commute", "mta", "metro north",
    "train", "bus", "parking",
    # food
    "food", "restaurant", "dining", "chef", "menu", "cuisine", "cafe", "bakery",
    "pizza", "bar", "brewery", "winery", "farmers market", "grocery",
]

BREAKING_WINDOW_HOURS = 2
DAILY_WINDOW_HOURS = 24


def _matches_any(text: str, terms: list[str]) -> bool:
    lower = text.lower()
    return any(t in lower for t in terms)


def _combined_text(article: dict) -> str:
    return f"{article['title']} {article['summary']}"


def filter_articles(articles: list[dict]) -> tuple[list[dict], list[dict]]:
    now = datetime.now(timezone.utc)
    daily_cutoff = now - timedelta(hours=DAILY_WINDOW_HOURS)
    breaking_cutoff = now - timedelta(hours=BREAKING_WINDOW_HOURS)

    seen_urls: set[str] = set()
    daily: list[dict] = []
    breaking: list[dict] = []

    for article in articles:
        if article["url"] in seen_urls:
            continue
        pub = article["published_at"]
        if pub < daily_cutoff:
            continue
        text = _combined_text(article)
        if not (_matches_any(text, WESTCHESTER_TERMS) or _matches_any(article["source"], WESTCHESTER_TERMS)):
            continue
        if not _matches_any(text, TOPIC_TERMS):
            continue

        seen_urls.add(article["url"])
        daily.append(article)
        if pub >= breaking_cutoff:
            breaking.append(article)

    daily.sort(key=lambda a: a["published_at"], reverse=True)
    breaking.sort(key=lambda a: a["published_at"], reverse=True)
    return daily, breaking
