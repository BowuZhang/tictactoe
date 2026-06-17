import anthropic

SYSTEM_PROMPT = """You are a local news editor for Westchester, NY. Your readers are families \
interested in kids & education, local traffic, and food & dining.

Given a list of recent articles (title + blurb), you will:
1. Select the 10 most newsworthy and relevant stories.
2. Write a clear 1–2 sentence summary for each.
3. Assign each story exactly one category: Kids/Education | Traffic | Food | General.
4. Return ONLY valid JSON — no extra text — matching this schema:

{
  "top_10": [
    {
      "rank": 1,
      "category": "...",
      "title": "...",
      "summary": "...",
      "source": "...",
      "url": "..."
    }
  ]
}"""


def _build_article_block(articles: list[dict]) -> str:
    lines = []
    for i, a in enumerate(articles, 1):
        blurb = a["summary"][:300].replace("\n", " ")
        lines.append(
            f"[{i}] SOURCE={a['source']} | TITLE={a['title']} | BLURB={blurb} | URL={a['url']}"
        )
    return "\n".join(lines)


def summarize(daily: list[dict], breaking: list[dict], client: anthropic.Anthropic) -> dict:
    article_block = _build_article_block(daily[:40])  # cap to avoid token overflow

    user_msg = f"Here are today's articles from Westchester, NY:\n\n{article_block}\n\nProduce the top_10 JSON now."

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )

    import json
    raw = response.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw)

    # Tag breaking news
    breaking_urls = {a["url"] for a in breaking}
    for story in result.get("top_10", []):
        story["breaking"] = story.get("url", "") in breaking_urls

    return result
