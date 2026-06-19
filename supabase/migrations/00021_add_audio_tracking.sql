ALTER TABLE reels ADD COLUMN IF NOT EXISTS audio_source_id uuid REFERENCES reels(id);
CREATE INDEX IF NOT EXISTS idx_reels_audio_source_id ON reels(audio_source_id);
