"""Extract HelloFresh (or similar) recipe cards from PDFs into data/recipes/*.json.

Usage:
  python scripts/ingest.py
  python scripts/ingest.py --pdf data/pdfs/pork.pdf
  python scripts/ingest.py --force

Requires OPENAI_API_KEY (optionally in .env.local).
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "data" / "pdfs"
OUT_DIR = ROOT / "data" / "recipes"
PAGES_DIR = ROOT / "data" / "pages"

SCHEMA_HINT = """
Return JSON with this exact shape (one recipe per page):
{
  "id": "hf-<protein>-<pagepadded>",
  "title": "Title Case dish name",
  "source": "hellofresh",
  "protein": "chicken|beef|pork|veggie|other",
  "cookTimeMin": null,
  "servings": 2,
  "tags": ["lowercase", "style", "tags"],
  "allergens": [],
  "ingredients": [{"name": "...", "qty2": "...", "qty3": "...", "qty4": "..."}],
  "pantry": [{"name": "...", "qty2": "...", "qty3": "...", "qty4": "...", "pantry": true}],
  "tools": ["frying pan"],
  "steps": [{"n": 1, "title": "Short title", "text": "Full instruction"}],
  "nutrition": {"kcal": 0, "kj": 0, "fat_g": 0, "sat_fat_g": 0, "carbs_g": 0, "sugars_g": 0, "protein_g": 0, "salt_g": 0},
  "highProtein": false,
  "pdf": {"file": "filename.pdf", "page": 1}
}

allergens MUST be a subset of:
gluten, milk, egg, soy, peanut, tree_nut, mustard, sulphites, sesame, celery, fish, crustacean
Map: soya→soy, nuts→tree_nut, cereals containing gluten→gluten, sulphites/sulfites→sulphites.
highProtein is true if protein_g >= 30.
Infer protein from the main meat (or veggie if none). Infer title from the Serve step / dish name.
Quantities are for 2P / 3P / 4P columns on the card.
"""


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
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "recipe"


def protein_from_filename(name: str) -> str:
    stem = Path(name).stem.lower()
    for p in ("chicken", "beef", "pork", "veggie", "vegetarian", "veg"):
        if p in stem:
            return "veggie" if p in {"veggie", "vegetarian", "veg"} else p
    return "other"


def render_pdf(pdf_path: Path, zoom: float = 2.0) -> list[Path]:
    import pymupdf

    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    mat = pymupdf.Matrix(zoom, zoom)
    paths: list[Path] = []
    stem = slug(pdf_path.stem)
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(matrix=mat, alpha=False)
        out = PAGES_DIR / f"{stem}-{i:02d}.png"
        pix.save(out)
        paths.append(out)
        print(f"  rendered {out.name} ({pix.width}x{pix.height})")
    doc.close()
    return paths


def extract_recipe(
    image_path: Path,
    *,
    protein: str,
    pdf_name: str,
    page: int,
    client,
    model: str,
) -> dict:
    b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
    prompt = (
        "Extract the HelloFresh UK recipe card in this image as JSON. "
        f"This card is from {pdf_name} page {page}. Default protein hint: {protein}. "
        f"Set id to hf-{protein}-{page:02d}. {SCHEMA_HINT}"
    )
    response = client.chat.completions.create(
        model=model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{b64}",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
    )
    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    data.setdefault("id", f"hf-{protein}-{page:02d}")
    data.setdefault("source", "hellofresh")
    data.setdefault("protein", protein)
    data.setdefault("pdf", {"file": pdf_name, "page": page})
    protein_g = (data.get("nutrition") or {}).get("protein_g") or 0
    data["highProtein"] = bool(data.get("highProtein") or protein_g >= 30)
    return data


def ingest_pdf(pdf_path: Path, *, force: bool, client, model: str) -> Path:
    protein = protein_from_filename(pdf_path.name)
    out_path = OUT_DIR / f"{slug(pdf_path.stem)}.json"
    if out_path.exists() and not force:
        print(f"skip {pdf_path.name} (already have {out_path.name}, use --force)")
        return out_path

    print(f"ingesting {pdf_path.name} as {protein}")
    pages = render_pdf(pdf_path)
    recipes = []
    for i, page_path in enumerate(pages, start=1):
        print(f"  extracting page {i}/{len(pages)}")
        recipes.append(
            extract_recipe(
                page_path,
                protein=protein,
                pdf_name=pdf_path.name,
                page=i,
                client=client,
                model=model,
            )
        )
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(recipes, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {len(recipes)} recipes → {out_path}")
    return out_path


def main() -> int:
    load_env()
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, help="Single PDF to ingest")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--model", default=os.environ.get("OPENAI_VISION_MODEL", "gpt-4o"))
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Set OPENAI_API_KEY in .env.local", file=sys.stderr)
        return 1

    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    pdfs = [args.pdf] if args.pdf else sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs in {PDF_DIR}")
        return 1

    for pdf in pdfs:
        ingest_pdf(pdf.resolve(), force=args.force, client=client, model=args.model)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
