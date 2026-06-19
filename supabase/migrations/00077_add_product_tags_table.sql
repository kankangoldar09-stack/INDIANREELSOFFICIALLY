-- Create product_tags table
CREATE TABLE IF NOT EXISTS product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_image_url TEXT,
  product_link TEXT NOT NULL,
  product_price TEXT,
  position_x NUMERIC NOT NULL DEFAULT 50,
  position_y NUMERIC NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT product_tags_post_or_reel_check CHECK (
    (post_id IS NOT NULL AND reel_id IS NULL) OR
    (post_id IS NULL AND reel_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_tags_post_id ON product_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_reel_id ON product_tags(reel_id);

-- RLS Policies
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

-- Anyone can view product tags
CREATE POLICY "product_tags_select_policy" ON product_tags
  FOR SELECT
  USING (true);

-- Authenticated users can insert product tags for their own posts/reels
CREATE POLICY "product_tags_insert_policy" ON product_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (post_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM posts WHERE posts.id = product_tags.post_id AND posts.owner_id = auth.uid()
    )) OR
    (reel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM reels WHERE reels.id = product_tags.reel_id AND reels.owner_id = auth.uid()
    ))
  );

-- Users can update product tags on their own posts/reels
CREATE POLICY "product_tags_update_policy" ON product_tags
  FOR UPDATE
  TO authenticated
  USING (
    (post_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM posts WHERE posts.id = product_tags.post_id AND posts.owner_id = auth.uid()
    )) OR
    (reel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM reels WHERE reels.id = product_tags.reel_id AND reels.owner_id = auth.uid()
    ))
  );

-- Users can delete product tags on their own posts/reels
CREATE POLICY "product_tags_delete_policy" ON product_tags
  FOR DELETE
  TO authenticated
  USING (
    (post_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM posts WHERE posts.id = product_tags.post_id AND posts.owner_id = auth.uid()
    )) OR
    (reel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM reels WHERE reels.id = product_tags.reel_id AND reels.owner_id = auth.uid()
    ))
  );