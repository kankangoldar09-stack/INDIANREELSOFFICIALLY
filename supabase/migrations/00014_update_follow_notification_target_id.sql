CREATE OR REPLACE FUNCTION public.notify_on_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NEW.following_id != NEW.follower_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type, target_id)
        VALUES (NEW.following_id, NEW.follower_id, 'follow', NEW.follower_id);
    END IF;
    RETURN NEW;
END;
$function$;
