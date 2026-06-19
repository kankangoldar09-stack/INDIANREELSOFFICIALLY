ALTER TABLE posts ADD COLUMN IF NOT EXISTS overlays jsonb DEFAULT '[]'::jsonb;
ALTER TABLE reels ADD COLUMN IF NOT EXISTS overlays jsonb DEFAULT '[]'::jsonb;