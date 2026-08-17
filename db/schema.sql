CREATE TABLE IF NOT EXISTS recipes (
  id text PRIMARY KEY,
  title text NOT NULL,
  protein text NOT NULL,
  source text NOT NULL,
  data jsonb NOT NULL,
  overlay jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  qty text NOT NULL DEFAULT '',
  recipe_id text,
  recipe_title text,
  checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_entries (
  id text PRIMARY KEY,
  recipe_id text NOT NULL,
  cook_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, cook_date)
);

CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);
