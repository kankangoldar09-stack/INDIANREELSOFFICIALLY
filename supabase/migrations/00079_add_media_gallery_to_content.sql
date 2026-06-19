ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_gallery JSONB DEFAULT '[]'::jsonb;
ALTER TABLE reels ADD COLUMN IF NOT EXISTS media_gallery JSONB DEFAULT '[]'::jsonb;
