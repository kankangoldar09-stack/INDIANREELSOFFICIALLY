-- Add column to comments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_ai_reply BOOLEAN DEFAULT FALSE;

-- Create extension if needed
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- Create function for messages trigger
CREATE OR REPLACE FUNCTION public.handle_new_message_for_ai()
RETURNS trigger AS $$
BEGIN
  IF (NEW.is_ai_reply IS NOT TRUE) THEN
    PERFORM
      net.http_post(
        url := 'https://kpcqxvhvojfjczryjrva.functions.supabase.co/ai-auto-pilot',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'messages',
          'record', row_to_json(NEW)
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for messages
DROP TRIGGER IF EXISTS on_new_message_ai ON public.messages;
CREATE TRIGGER on_new_message_ai
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_for_ai();

-- Function for comments trigger
CREATE OR REPLACE FUNCTION public.handle_new_comment_for_ai()
RETURNS trigger AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  IF (NEW.is_ai_reply IS NOT TRUE) THEN
    -- Get the owner of the post or reel
    IF (NEW.post_id IS NOT NULL) THEN
      SELECT owner_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
    ELSIF (NEW.reel_id IS NOT NULL) THEN
      SELECT owner_id INTO post_owner_id FROM public.reels WHERE id = NEW.reel_id;
    END IF;

    -- Only proceed if the owner is NOT the person who commented
    IF (post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id) THEN
      PERFORM
        net.http_post(
          url := 'https://kpcqxvhvojfjczryjrva.functions.supabase.co/ai-auto-pilot',
          headers := jsonb_build_object(
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object(
            'type', 'INSERT',
            'table', 'comments',
            'record', row_to_json(NEW),
            'owner_id', post_owner_id
          )
        );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comments
DROP TRIGGER IF EXISTS on_new_comment_ai ON public.comments;
CREATE TRIGGER on_new_comment_ai
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment_for_ai();
