-- Add main_token_id to core tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.highlights ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT gen_random_uuid() UNIQUE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_main_token_id ON public.profiles(main_token_id);
CREATE INDEX IF NOT EXISTS idx_posts_main_token_id ON public.posts(main_token_id);
CREATE INDEX IF NOT EXISTS idx_reels_main_token_id ON public.reels(main_token_id);
CREATE INDEX IF NOT EXISTS idx_stories_main_token_id ON public.stories(main_token_id);
CREATE INDEX IF NOT EXISTS idx_comments_main_token_id ON public.comments(main_token_id);
CREATE INDEX IF NOT EXISTS idx_messages_main_token_id ON public.messages(main_token_id);
CREATE INDEX IF NOT EXISTS idx_groups_main_token_id ON public.groups(main_token_id);
CREATE INDEX IF NOT EXISTS idx_highlights_main_token_id ON public.highlights(main_token_id);
CREATE INDEX IF NOT EXISTS idx_notifications_main_token_id ON public.notifications(main_token_id);
CREATE INDEX IF NOT EXISTS idx_feedback_main_token_id ON public.feedback(main_token_id);
