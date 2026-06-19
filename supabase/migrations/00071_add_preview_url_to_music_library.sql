ALTER TABLE music_library ADD COLUMN IF NOT EXISTS preview_url TEXT;

-- Update RLS policies to allow reading the preview_url
-- (Already handled by SELECT policy usually, but good to check)
