-- Create music_library table for storing music tracks
CREATE TABLE music_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  song_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  telegram_file_id TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX idx_music_library_song_name ON music_library(song_name);
CREATE INDEX idx_music_library_artist_name ON music_library(artist_name);

-- Enable RLS
ALTER TABLE music_library ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read music
CREATE POLICY "Anyone can view music library"
  ON music_library
  FOR SELECT
  TO public
  USING (true);

-- Policy: Authenticated users can insert music
CREATE POLICY "Authenticated users can add music"
  ON music_library
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update music (for admin features)
CREATE POLICY "Authenticated users can update music"
  ON music_library
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Users can delete music (for admin features)
CREATE POLICY "Authenticated users can delete music"
  ON music_library
  FOR DELETE
  TO authenticated
  USING (true);