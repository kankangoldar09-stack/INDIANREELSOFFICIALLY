-- Add hide_views_pref to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hide_views_pref boolean DEFAULT false;

-- Add hide_likes and hide_comments to posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS hide_likes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_comments boolean DEFAULT false;

-- Add hide_likes and hide_comments to reels
ALTER TABLE public.reels 
ADD COLUMN IF NOT EXISTS hide_likes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_comments boolean DEFAULT false;

-- Force RLS update to ensure these columns are accessible if needed
-- (Though they already are under current policies)
