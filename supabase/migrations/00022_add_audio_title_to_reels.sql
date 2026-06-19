ALTER TABLE reels ADD COLUMN IF NOT EXISTS audio_title text;
COMMENT ON COLUMN reels.audio_title IS 'Custom title for the original audio created by the user';
