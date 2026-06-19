-- Add title column to reels table
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS title text;

-- Add title column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS title text;