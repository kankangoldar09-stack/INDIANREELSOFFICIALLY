-- Create telegram_chunks table for tracking chunked uploads
CREATE TABLE IF NOT EXISTS telegram_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  total_chunks integer NOT NULL,
  chunk_links text[] NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_chunks_upload_id ON telegram_chunks(upload_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chunks_user_id ON telegram_chunks(user_id);

-- Enable RLS
ALTER TABLE telegram_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own chunks
CREATE POLICY "Users can insert their own chunks"
  ON telegram_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own chunks
CREATE POLICY "Users can view their own chunks"
  ON telegram_chunks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);