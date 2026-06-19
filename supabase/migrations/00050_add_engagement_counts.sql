-- Ensure all necessary count columns exist
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0;

-- Optionally, you might want to initialize them to 0 if they are null
UPDATE public.posts SET shares_count = 0 WHERE shares_count IS NULL;
UPDATE public.posts SET saves_count = 0 WHERE saves_count IS NULL;
UPDATE public.reels SET shares_count = 0 WHERE shares_count IS NULL;
UPDATE public.reels SET saves_count = 0 WHERE saves_count IS NULL;