-- Add profile music fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_music_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_music_track_id uuid;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_music_custom_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_music_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_music_artist text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_music_thumbnail_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_music_play_count integer DEFAULT 0;

-- Create index for profile music queries
CREATE INDEX IF NOT EXISTS idx_profiles_music_enabled ON profiles(profile_music_enabled) WHERE profile_music_enabled = true;