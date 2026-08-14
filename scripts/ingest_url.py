"""Add an online recipe URL into data/recipes/web-*.json using the same schema.

Usage:
  python scripts/ingest_url.py https://example.com/some-recipe
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "recipes"


class TextExtractor(HTMLParser):
    skip = {"script", "style", "noscript"}

    def __init__(self) -> None:
        super().__init__()
        self._skip = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in self.skip:
            self._skip += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in self.skip and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        text = " ".join(data.split())
        if text:
            self.parts.append(text)


def load_env() -> None:
    for name in (".env.local", ".env"):
        path = ROOT / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip() or line.strip().startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "web"


def fetch_text(url: str) -> str:
    req = Request(url, headers={"User-Agent": "recipe-helper/0.1"})
    with urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
    parser = TextExtractor()
    parser.feed(html)
    return " ".join(parser.parts)[:20000]


def main() -> int:
    load_env()
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--model", default=os.environ.get("OPENAI_CHAT_MODEL", "gpt-4.1-mini"))
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Set OPENAI_API_KEY in .env.local", file=sys.stderr)
        return 1

    from openai import OpenAI

    page_text = fetch_text(args.url)
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=args.model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "Extract a single recipe as JSON matching this schema: "
                    "id, title, source='web', sourceUrl, protein (chicken|beef|pork|fish|veggie|other), "
                    "cookTimeMin, servings, tags[], allergens[] (gluten,milk,egg,soy,peanut,tree_nut,"
                    "mustard,sulphites,sesame,celery,fish,crustacean), "
                    "ingredients[{name,qty2}], pantry[], tools[], steps[{n,title,text}], "
                    "nutrition{kcal,protein_g,fat_g,carbs_g} if present, highProtein (protein_g>=30). "
                    "qty2 is the listed quantity. If servings aren't 2, still put the listed qty in qty2."
                ),
            },
            {
                "role": "user",
                "content": f"URL: {args.url}\n\nPAGE TEXT:\n{page_text}",
            },
        ],
    )
    data = json.loads(response.choices[0].message.content or "{}")
    data["source"] = "web"
    data["sourceUrl"] = args.url
    title = data.get("title") or "web-recipe"
    data.setdefault("id", f"web-{slug(title)}")
    protein_g = (data.get("nutrition") or {}).get("protein_g") or 0
    data["highProtein"] = bool(data.get("highProtein") or protein_g >= 30)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{data['id']}.json"
    out.write_text(json.dumps([data], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
