#!/usr/bin/env python3
"""Westchester, NY daily news summarization agent."""

import os
import sys

import anthropic
from dotenv import load_dotenv

from fetcher import fetch_all
from filter import filter_articles
from summarizer import summarize
from formatter import format_output


def main():
    load_dotenv()
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set. Copy .env.example to .env and fill in your key.")
        sys.exit(1)

    print("Fetching Westchester news...", flush=True)
    articles = fetch_all()
    print(f"  {len(articles)} raw articles fetched.", flush=True)

    daily, breaking = filter_articles(articles)
    print(f"  {len(daily)} relevant articles after filtering ({len(breaking)} breaking).", flush=True)

    if not daily:
        print("No relevant Westchester articles found in the last 24 hours.")
        return

    print("Summarizing with Claude...", flush=True)
    client = anthropic.Anthropic(api_key=api_key)
    result = summarize(daily, breaking, client)

    output = format_output(result, breaking)
    print("\n" + output)


if __name__ == "__main__":
    main()
