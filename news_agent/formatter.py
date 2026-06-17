from datetime import datetime, timezone


CATEGORY_EMOJI = {
    "Kids/Education": "🎒",
    "Traffic": "🚗",
    "Food": "🍽️",
    "General": "📰",
}


def format_output(result: dict, breaking: list[dict]) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [f"Westchester, NY — Daily News Digest", f"Generated: {now}", ""]

    # Breaking news section
    breaking_stories = [s for s in result.get("top_10", []) if s.get("breaking")]
    if breaking_stories:
        lines.append("=" * 50)
        lines.append("  BREAKING NEWS")
        lines.append("=" * 50)
        for story in breaking_stories:
            emoji = CATEGORY_EMOJI.get(story.get("category", ""), "📰")
            lines.append(f"{emoji}  [{story['category']}] {story['title']}")
            lines.append(f"   {story['summary']}")
            lines.append(f"   Source: {story['source']}  |  {story['url']}")
            lines.append("")
    else:
        lines.append("(No breaking news in the last 2 hours.)")
        lines.append("")

    # Top 10
    lines.append("=" * 50)
    lines.append("  TOP 10 STORIES TODAY")
    lines.append("=" * 50)
    for story in result.get("top_10", []):
        emoji = CATEGORY_EMOJI.get(story.get("category", ""), "📰")
        breaking_tag = " [BREAKING]" if story.get("breaking") else ""
        lines.append(f"{story['rank']}. {emoji} [{story['category']}]{breaking_tag} {story['title']}")
        lines.append(f"   {story['summary']}")
        lines.append(f"   Source: {story['source']}  |  {story['url']}")
        lines.append("")

    return "\n".join(lines)
