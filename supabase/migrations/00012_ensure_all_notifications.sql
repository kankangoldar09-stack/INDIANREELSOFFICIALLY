-- Ensure all social notification triggers are correctly in place

-- 1. Notify followers on new Post
CREATE OR REPLACE FUNCTION public.notify_followers_on_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    SELECT follower_id, NEW.owner_id, 'new_post', NEW.id
    FROM public.follows
    WHERE following_id = NEW.owner_id;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_notify_followers_on_post ON public.posts;
CREATE TRIGGER tr_notify_followers_on_post
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_post();

-- 2. Notify followers on new Reel
CREATE OR REPLACE FUNCTION public.notify_followers_on_reel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.notifications (user_id, actor_id, type, reel_id)
    SELECT follower_id, NEW.owner_id, 'new_reel', NEW.id
    FROM public.follows
    WHERE following_id = NEW.owner_id;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_notify_followers_on_reel ON public.reels;
CREATE TRIGGER tr_notify_followers_on_reel
AFTER INSERT ON public.reels
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_reel();

-- 3. Notify on Like (Post, Reel, Comment)
CREATE OR REPLACE FUNCTION public.notify_on_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    target_owner_id UUID;
    v_type TEXT;
BEGIN
    IF NEW.post_id IS NOT NULL THEN
        SELECT owner_id INTO target_owner_id FROM public.posts WHERE id = NEW.post_id;
        v_type := 'like_post';
    ELSIF NEW.reel_id IS NOT NULL THEN
        SELECT owner_id INTO target_owner_id FROM public.reels WHERE id = NEW.reel_id;
        v_type := 'like_reel';
    ELSIF NEW.comment_id IS NOT NULL THEN
        SELECT user_id INTO target_owner_id FROM public.comments WHERE id = NEW.comment_id;
        v_type := 'like_comment';
    END IF;

    IF target_owner_id IS NOT NULL AND target_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type, post_id, reel_id, comment_id)
        VALUES (target_owner_id, NEW.user_id, v_type, NEW.post_id, NEW.reel_id, NEW.comment_id);
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_notify_on_like ON public.likes;
CREATE TRIGGER tr_notify_on_like
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- 4. Notify on Comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    target_owner_id UUID;
    v_type TEXT;
BEGIN
    IF NEW.post_id IS NOT NULL THEN
        SELECT owner_id INTO target_owner_id FROM public.posts WHERE id = NEW.post_id;
        v_type := 'comment_post';
    ELSIF NEW.reel_id IS NOT NULL THEN
        SELECT owner_id INTO target_owner_id FROM public.reels WHERE id = NEW.reel_id;
        v_type := 'comment_reel';
    END IF;

    IF target_owner_id IS NOT NULL AND target_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type, post_id, reel_id)
        VALUES (target_owner_id, NEW.user_id, v_type, NEW.post_id, NEW.reel_id);
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_notify_on_comment ON public.comments;
CREATE TRIGGER tr_notify_on_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- 5. Notify on Follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NEW.following_id != NEW.follower_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type)
        VALUES (NEW.following_id, NEW.follower_id, 'follow');
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_notify_on_follow ON public.follows;
CREATE TRIGGER tr_notify_on_follow
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
