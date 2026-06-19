CREATE TABLE IF NOT EXISTS public.typing_indicators (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, target_id)
);

-- RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read typing indicators" ON public.typing_indicators FOR SELECT USING (true);
CREATE POLICY "Users can manage their own typing status" ON public.typing_indicators FOR ALL USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
