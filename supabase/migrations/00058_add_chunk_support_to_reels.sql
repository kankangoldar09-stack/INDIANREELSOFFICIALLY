-- Add columns to support chunked video uploads
ALTER TABLE reels 
ADD COLUMN IF NOT EXISTS is_chunked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS chunk_urls jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN reels.is_chunked IS 'True if video is split into multiple chunks';
COMMENT ON COLUMN reels.chunk_urls IS 'Array of chunk URLs for sequential playback';