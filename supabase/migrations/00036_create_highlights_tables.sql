-- Create highlights table
CREATE TABLE IF NOT EXISTS public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create highlight_stories junction table
CREATE TABLE IF NOT EXISTS public.highlight_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id UUID NOT NULL REFERENCES public.highlights(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(highlight_id, story_id)
);

-- RLS Policies for highlights
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public highlights" ON public.highlights
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own highlights" ON public.highlights
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for highlight_stories
ALTER TABLE public.highlight_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view highlight stories" ON public.highlight_stories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.highlights h WHERE h.id = highlight_id)
  );

CREATE POLICY "Users can manage own highlight stories" ON public.highlight_stories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.highlights h WHERE h.id = highlight_id AND h.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_highlights_user_id ON public.highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_highlight_stories_highlight_id ON public.highlight_stories(highlight_id);
CREATE INDEX IF NOT EXISTS idx_highlight_stories_story_id ON public.highlight_stories(story_id);
