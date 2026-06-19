ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS threads_username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS music_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS music_url TEXT;