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
