-- Add media_type column to stories table
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video'));