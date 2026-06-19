-- Create music_favorites table
CREATE TABLE IF NOT EXISTS public.music_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    preview_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, track_id)
);

-- Set up RLS
ALTER TABLE public.music_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own music favorites"
ON public.music_favorites
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Helper function for checking favorites
CREATE OR REPLACE FUNCTION public.can_manage_music_favorite(favorite_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = favorite_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
