
-- Update the trigger function to use metadata from signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  meta_username text;
  meta_full_name text;
  meta_dob text;
  meta_city text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Extract metadata from raw_user_meta_data
  meta_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  meta_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  meta_dob := NEW.raw_user_meta_data->>'dob';
  meta_city := NEW.raw_user_meta_data->>'city';

  INSERT INTO public.profiles (id, username, email, full_name, dob, city, role, created_at)
  VALUES (
    NEW.id,
    meta_username,
    NEW.email,
    meta_full_name,
    meta_dob::date,
    meta_city,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    now()
  );

  -- Record first username in history
  INSERT INTO public.username_history (user_id, username, changed_at)
  VALUES (NEW.id, meta_username, now());

  RETURN NEW;
END;
$$;
