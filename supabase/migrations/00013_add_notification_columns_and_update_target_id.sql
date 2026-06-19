-- 1. Add specific columns for clarity (optional but recommended for the current trigger logic)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. Make target_id nullable if it was NOT NULL (since we are using specific columns now)
ALTER TABLE public.notifications ALTER COLUMN target_id DROP NOT NULL;

-- 3. Re-ensure the triggers are correct (using the specific columns)
-- (They are already using these columns, but I will re-apply them to be safe)

CREATE OR REPLACE FUNCTION public.notify_followers_on_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, target_id)
    SELECT follower_id, NEW.owner_id, 'new_post', NEW.id, NEW.id
    FROM public.follows
    WHERE following_id = NEW.owner_id;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_followers_on_reel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.notifications (user_id, actor_id, type, reel_id, target_id)
    SELECT follower_id, NEW.owner_id, 'new_reel', NEW.id, NEW.id
    FROM public.follows
    WHERE following_id = NEW.owner_id;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    target_owner_id UUID;
    v_type TEXT;
    v_target_id UUID;
BEGIN
    IF NEW.post_id IS NOT NULL THEN
        SELECT owner_id INTO target_owner_id FROM public.posts WHERE id = NEW.post_id;
        v_type := 'like_post';
        v_target_id := NEW.post_id;
    ELSIF NEW.reel_id IS NOT NULL THEN
        SELECT owner_id INTO target_owner_id FROM public.reels WHERE id = NEW.reel_id;
        v_type := 'like_reel';
        v_target_id := NEW.reel_id;
    ELSIF NEW.comment_id IS NOT NULL THEN
        SELECT user_id INTO target_owner_id FROM public.comments WHERE id = NEW.comment_id;
        v_type := 'like_comment';
        v_target_id := NEW.comment_id;
    END IF;

    IF target_owner_id IS NOT NULL AND target_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type, post_id, reel_id, comment_id, target_id)
        VALUES (target_owner_id, NEW.user_id, v_type, NEW.post_id, NEW.reel_id, NEW.comment_id, v_target_id);
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    target_owner_id UUID;
    v_type TEXT;
    v_target_id UUID;
BEGIN
    IF NEW.post_id IS NOT NULL THEN
        SELECT owner_id INTO target_owner_id FROM public.posts WHERE id = NEW.post_id;
        v_type := 'comment_post';
        v_target_id := NEW.post_id;
    ELSIF NEW.reel_id IS NOT NULL THEN
        SELECT owner_id INTO target_owner_id FROM public.reels WHERE id = NEW.reel_id;
        v_type := 'comment_reel';
        v_target_id := NEW.reel_id;
    END IF;

    IF target_owner_id IS NOT NULL AND target_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type, post_id, reel_id, target_id)
        VALUES (target_owner_id, NEW.user_id, v_type, NEW.post_id, NEW.reel_id, v_target_id);
    END IF;
    RETURN NEW;
END;
$function$;
