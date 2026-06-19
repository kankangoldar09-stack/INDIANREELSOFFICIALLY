-- Story Views Table
CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Story Likes Table
CREATE TABLE IF NOT EXISTS public.story_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_views
CREATE POLICY "Users can view story views" ON story_views FOR SELECT USING (true);
CREATE POLICY "Users can insert their own views" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- RLS Policies for story_likes
CREATE POLICY "Users can view story likes" ON story_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own likes" ON story_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON story_likes FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user_id ON story_likes(user_id);