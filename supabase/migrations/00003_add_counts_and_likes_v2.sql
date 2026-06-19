-- Create a function to toggle likes
CREATE OR REPLACE FUNCTION toggle_like(
  p_user_id uuid,
  p_post_id uuid DEFAULT NULL,
  p_reel_id uuid DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM likes 
    WHERE user_id = p_user_id 
    AND (post_id = p_post_id OR (post_id IS NULL AND p_post_id IS NULL))
    AND (reel_id = p_reel_id OR (reel_id IS NULL AND p_reel_id IS NULL))
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM likes 
    WHERE user_id = p_user_id 
    AND (post_id = p_post_id OR (post_id IS NULL AND p_post_id IS NULL))
    AND (reel_id = p_reel_id OR (reel_id IS NULL AND p_reel_id IS NULL));
    RETURN false;
  ELSE
    INSERT INTO likes (user_id, post_id, reel_id)
    VALUES (p_user_id, p_post_id, p_reel_id);
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for posts with counts
CREATE OR REPLACE VIEW posts_with_stats AS
SELECT 
  p.*,
  (SELECT count(*) FROM likes l WHERE l.post_id = p.id) as likes_count,
  (SELECT count(*) FROM comments c WHERE c.post_id = p.id) as comments_count
FROM posts p;

-- View for reels with counts
CREATE OR REPLACE VIEW reels_with_stats AS
SELECT 
  r.*,
  (SELECT count(*) FROM likes l WHERE l.reel_id = r.id) as likes_count,
  (SELECT count(*) FROM comments c WHERE c.reel_id = r.id) as comments_count
FROM reels r;
