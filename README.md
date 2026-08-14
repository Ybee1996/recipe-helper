# Recipe Box

Personal phone-first recipe search and chat over your HelloFresh cards (and later, web recipes).

## Run

```bash
npm install
copy .env.example .env.local   # then add OPENAI_API_KEY
npm run dev
```

Open the local URL on your phone (same Wi-Fi) or use the browser. Add to Home Screen from Safari/Chrome for an app-like feel.

Search works without an API key. Chat needs `OPENAI_API_KEY`.

## Add more HelloFresh PDFs

1. Drop `pork.pdf` / `veggie.pdf` (or any `*.pdf`) into `data/pdfs/`
2. `pip install -r requirements.txt`
3. `python scripts/ingest.py --force`  (or omit `--force` to skip PDFs already extracted)

Each PDF page is treated as one recipe card.

## Add an online recipe

```bash
python scripts/ingest_url.py https://www.example.com/recipe
```

Then refresh the app.
