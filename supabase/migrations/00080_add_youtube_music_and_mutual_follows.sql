-- Add youtube_id to music_library
ALTER TABLE public.music_library ADD COLUMN IF NOT EXISTS youtube_id TEXT;

-- Index for follows to optimize mutual follow checks
CREATE INDEX IF NOT EXISTS idx_follows_mutual ON public.follows (following_id, follower_id);

-- Add source_type to music_library if not exists
ALTER TABLE public.music_library ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'telegram';
