-- Ensure audio columns exist in reels
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'audio_source_id') THEN
        ALTER TABLE reels ADD COLUMN audio_source_id uuid REFERENCES reels(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'audio_title') THEN
        ALTER TABLE reels ADD COLUMN audio_title text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'is_chunked') THEN
        ALTER TABLE reels ADD COLUMN is_chunked boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'chunk_urls') THEN
        ALTER TABLE reels ADD COLUMN chunk_urls jsonb;
    END IF;
END $$;

-- Ensure chunk columns exist in posts too
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'is_chunked') THEN
        ALTER TABLE posts ADD COLUMN is_chunked boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'chunk_urls') THEN
        ALTER TABLE posts ADD COLUMN chunk_urls jsonb;
    END IF;
END $$;
