CREATE TABLE IF NOT EXISTS video_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_token_id UUID DEFAULT uuid_generate_v4(),
    video_url TEXT NOT NULL,
    telegram_channel_id TEXT,
    admin_user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE music_library ADD COLUMN IF NOT EXISTS main_token_id UUID DEFAULT uuid_generate_v4();

-- Enable RLS
ALTER TABLE video_links ENABLE ROW LEVEL SECURITY;

-- Policies for video_links
CREATE POLICY "Admins can manage video_links" ON video_links
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Update music_library policies if needed (assuming already public SELECT)
