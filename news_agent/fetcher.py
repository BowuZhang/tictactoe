import feedparser
import requests
from datetime import datetime, timezone
from dateutil import parser as dateparser

RSS_FEEDS = [
    # Journal News / lohud.com
    ("lohud", "https://www.lohud.com/rss/"),
    # Patch – Westchester towns
    ("patch-white-plains", "https://patch.com/new-york/white-plains/rss.xml"),
    ("patch-yonkers", "https://patch.com/new-york/yonkers/rss.xml"),
    ("patch-scarsdale", "https://patch.com/new-york/scarsdale/rss.xml"),
    ("patch-new-rochelle", "https://patch.com/new-york/new-rochelle/rss.xml"),
    ("patch-mount-vernon", "https://patch.com/new-york/mount-vernon/rss.xml"),
    ("patch-tarrytown", "https://patch.com/new-york/tarrytown-sleepy-hollow/rss.xml"),
    # Westchester Magazine
    ("westchester-mag", "https://www.westchestermagazine.com/feed/"),
    # Yonkers Times
    ("yonkers-times", "https://yonkerstimes.com/feed/"),
    # Google News RSS – Westchester NY
    ("google-news", "https://news.google.com/rss/search?q=Westchester+NY&hl=en-US&gl=US&ceid=US:en"),
]

HEADERS = {"User-Agent": "WestchesterNewsAgent/1.0"}


def _parse_date(entry) -> datetime:
    for field in ("published", "updated"):
        raw = getattr(entry, field, None)
        if raw:
            try:
                dt = dateparser.parse(raw)
                if dt and dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except Exception:
                pass
    return datetime.now(timezone.utc)


def fetch_all() -> list[dict]:
    articles = []
    for source, url in RSS_FEEDS:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            feed = feedparser.parse(resp.content)
        except Exception:
            try:
                feed = feedparser.parse(url)
            except Exception:
                continue

        for entry in feed.entries:
            articles.append({
                "source": source,
                "title": getattr(entry, "title", ""),
                "url": getattr(entry, "link", ""),
                "summary": getattr(entry, "summary", "") or getattr(entry, "description", ""),
                "published_at": _parse_date(entry),
            })

    return articles
