# Recipe Box

Personal phone-first recipe search and chat over your HelloFresh cards (and later, web recipes).

Recipes, ratings, notes, and edits live in **Neon Postgres** so they persist on Vercel.

## Setup

1. Create a free [Neon](https://console.neon.tech) project and copy the connection string.
2. Install and configure env:

```bash
npm install
copy .env.example .env.local
```

Set `DATABASE_URL` (required) and `OPENAI_API_KEY` (chat + URL import).

3. Create the table and load existing JSON:

```bash
npm run db:push
npm run db:seed
npm run dev
```

Open the local URL on your phone (same Wi-Fi) or use the browser. Add to Home Screen from Safari/Chrome for an app-like feel.

Search and handwritten recipes work without an API key. Chat and **Paste URL** need `OPENAI_API_KEY`.

## Add recipes

Use the **Add** tab in the app: paste a recipe URL, or type title / ingredients / steps. After save, the detail page can still edit ingredients, steps, ratings, and notes.

## Add more HelloFresh PDFs

1. Drop `pork.pdf` / `veggie.pdf` (or any `*.pdf`) into `data/pdfs/`
2. `pip install -r requirements.txt`
3. `python scripts/ingest.py --force`  (or omit `--force` to skip PDFs already extracted)
4. `npm run db:seed` to upsert into Neon (existing notes/ratings are kept)

Each PDF page is treated as one recipe card.

## Deploy

On Vercel, set `DATABASE_URL` and `OPENAI_API_KEY`. The live URL is unlisted; anyone who finds it can read and edit the box.
