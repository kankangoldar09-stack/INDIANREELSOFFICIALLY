-- Update handle_new_user to be more robust and use metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  target_username text;
  base_username text;
  final_username text;
  counter int := 0;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Try to get username from metadata
  target_username := NEW.raw_user_meta_data->>'username';
  
  -- Fallback if no username in metadata
  IF target_username IS NULL THEN
    target_username := COALESCE(split_part(NEW.email, '@', 1), 'user');
  END IF;

  base_username := target_username;
  final_username := target_username;

  -- Handle potential duplicate usernames
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, full_name, email, dob, city, role, created_at)
      VALUES (
        NEW.id,
        final_username,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        (NEW.raw_user_meta_data->>'dob')::date,
        NEW.raw_user_meta_data->>'city',
        CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
        now()
      );
      
      -- If insert succeeds, exit loop
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- If username exists, append a random string or counter and try again
      counter := counter + 1;
      final_username := base_username || counter || substr(md5(random()::text), 1, 4);
      -- Prevent infinite loop just in case
      IF counter > 10 THEN
        final_username := base_username || '_' || NEW.id;
        INSERT INTO public.profiles (id, username, full_name, email, dob, city, role, created_at)
        VALUES (
          NEW.id,
          final_username,
          NEW.raw_user_meta_data->>'full_name',
          NEW.email,
          (NEW.raw_user_meta_data->>'dob')::date,
          NEW.raw_user_meta_data->>'city',
          CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
          now()
        );
        EXIT;
      END IF;
    END;
  END LOOP;

  -- Record first username in history
  INSERT INTO public.username_history (user_id, username, changed_at)
  VALUES (NEW.id, final_username, now());

  RETURN NEW;
END;
$$;

-- Change trigger to AFTER INSERT for more reliable profile creation
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
