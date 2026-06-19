-- 1. Add visibility control to posts and reels
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;
ALTER TABLE reels ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- 2. Create vault settings (PIN storage)
CREATE TABLE IF NOT EXISTS vault_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create vault items (Hidden gallery)
CREATE TABLE IF NOT EXISTS vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'video')),
  media_url text NOT NULL,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- 4. Create vault notes (Secret notepad)
CREATE TABLE IF NOT EXISTS vault_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. RLS Policies
ALTER TABLE vault_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_notes ENABLE ROW LEVEL SECURITY;

-- Settings: Only owner
CREATE POLICY "Users can manage their own vault settings" ON vault_settings
  FOR ALL USING (auth.uid() = user_id);

-- Items: Only owner
CREATE POLICY "Users can manage their own vault items" ON vault_items
  FOR ALL USING (auth.uid() = user_id);

-- Notes: Only owner
CREATE POLICY "Users can manage their own vault notes" ON vault_notes
  FOR ALL USING (auth.uid() = user_id);

-- Update public feed filters
-- We need to ensure existing policies for posts/reels are updated to exclude is_hidden=true for other users
-- Usually policies look like: auth.uid() = owner_id OR NOT is_private
-- We should add AND NOT is_hidden
