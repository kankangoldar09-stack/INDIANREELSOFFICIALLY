-- Add parent_id column for nested replies
ALTER TABLE comments ADD COLUMN parent_id uuid REFERENCES comments(id) ON DELETE CASCADE;

-- Create index for faster reply queries
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;