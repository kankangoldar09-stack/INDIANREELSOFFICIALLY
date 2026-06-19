-- Ensure social control columns exist in reels and posts
DO $$ 
BEGIN 
    -- Reels
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'hide_likes') THEN
        ALTER TABLE reels ADD COLUMN hide_likes boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'hide_comments') THEN
        ALTER TABLE reels ADD COLUMN hide_comments boolean DEFAULT false;
    END IF;

    -- Posts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'hide_likes') THEN
        ALTER TABLE posts ADD COLUMN hide_likes boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'hide_comments') THEN
        ALTER TABLE posts ADD COLUMN hide_comments boolean DEFAULT false;
    END IF;
END $$;
