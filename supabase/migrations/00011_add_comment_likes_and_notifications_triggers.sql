-- 1. Add comment_id to likes table
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. Update UNIQUE constraint on likes to include comment_id
-- First drop the existing one if we can identify it, or just add a new one if it doesn't conflict.
-- The existing one was UNIQUE(user_id, post_id, reel_id)
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_post_id_reel_id_key;
ALTER TABLE public.likes ADD CONSTRAINT likes_user_id_target_unique UNIQUE (user_id, post_id, reel_id, comment_id);

-- 3. Update Notifications RLS
CREATE POLICY "Anyone can insert notifications" ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Notification Triggers

-- Trigger for Likes
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
  v_type text;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT owner_id INTO v_owner_id FROM public.posts WHERE id = NEW.post_id;
    v_type := 'like_post';
  ELSIF NEW.reel_id IS NOT NULL THEN
    SELECT owner_id INTO v_owner_id FROM public.reels WHERE id = NEW.reel_id;
    v_type := 'like_reel';
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT user_id INTO v_owner_id FROM public.comments WHERE id = NEW.comment_id;
    v_type := 'like_comment';
  END IF;

  IF v_owner_id IS NOT NULL AND v_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_id)
    VALUES (v_owner_id, NEW.user_id, v_type, COALESCE(NEW.post_id, NEW.reel_id, NEW.comment_id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Trigger for Comments
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
  v_type text;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT owner_id INTO v_owner_id FROM public.posts WHERE id = NEW.post_id;
    v_type := 'comment_post';
  ELSIF NEW.reel_id IS NOT NULL THEN
    SELECT owner_id INTO v_owner_id FROM public.reels WHERE id = NEW.reel_id;
    v_type := 'comment_reel';
  END IF;

  IF v_owner_id IS NOT NULL AND v_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_id)
    VALUES (v_owner_id, NEW.user_id, v_type, COALESCE(NEW.post_id, NEW.reel_id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Trigger for Follows
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger AS $$
BEGIN
  IF NEW.follower_id != NEW.following_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_id)
    VALUES (NEW.following_id, NEW.follower_id, 'follow', NEW.follower_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_created
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Trigger for New Posts (Notify Followers)
CREATE OR REPLACE FUNCTION public.notify_followers_on_post()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, target_id)
  SELECT follower_id, NEW.owner_id, 'new_post', NEW.id
  FROM public.follows
  WHERE following_id = NEW.owner_id AND status = 'accepted'::public.follow_status;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_created
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_post();

-- Trigger for New Reels (Notify Followers)
CREATE OR REPLACE FUNCTION public.notify_followers_on_reel()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, target_id)
  SELECT follower_id, NEW.owner_id, 'new_reel', NEW.id
  FROM public.follows
  WHERE following_id = NEW.owner_id AND status = 'accepted'::public.follow_status;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_reel_created
  AFTER INSERT ON public.reels
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_reel();
