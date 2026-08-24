-- 757 Local Promo Spotlights — D1 Schema
-- Run: npx wrangler d1 execute 757local-promos --file=./schema.sql --remote

CREATE TABLE IF NOT EXISTS promos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  promo_headline TEXT NOT NULL,
  promo_copy TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cta_text TEXT,
  cta_url TEXT,
  instagram TEXT,
  tiktok TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  stripe_session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_promos_status ON promos(status);
CREATE INDEX IF NOT EXISTS idx_promos_expires_at ON promos(expires_at);
