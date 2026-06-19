-- Create user_presence table for proximity tracking
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  is_online BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Add theme_color to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'theme_color'
  ) THEN
    ALTER TABLE profiles ADD COLUMN theme_color TEXT DEFAULT '#8B5CF6';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Policies for user_presence
CREATE POLICY "Users can view all online presence"
  ON user_presence FOR SELECT
  USING (is_online = true);

CREATE POLICY "Users can insert own presence"
  ON user_presence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
  ON user_presence FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presence"
  ON user_presence FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster proximity queries
CREATE INDEX IF NOT EXISTS idx_user_presence_location ON user_presence(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(is_online) WHERE is_online = true;

-- Enable Realtime for user_presence
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;