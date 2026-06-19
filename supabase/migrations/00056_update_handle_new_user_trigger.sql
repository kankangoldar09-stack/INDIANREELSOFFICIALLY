
-- Update trigger function to include phone and handle new user logic properly
CREATE OR REPLACE FUNCTION handle_new_user()
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
  meta_dob text;
  meta_city text;
  meta_full_name text;
  parsed_dob date;
BEGIN
  -- Get metadata
  target_username := NEW.raw_user_meta_data->>'username';
  meta_full_name := NEW.raw_user_meta_data->>'full_name';
  meta_dob := NEW.raw_user_meta_data->>'dob';
  meta_city := NEW.raw_user_meta_data->>'city';
  
  -- Attempt to parse dob if it exists
  IF meta_dob IS NOT NULL AND meta_dob != '' THEN
    BEGIN
      parsed_dob := meta_dob::date;
    EXCEPTION WHEN others THEN
      parsed_dob := NULL;
    END;
  ELSE
    parsed_dob := NULL;
  END IF;

  -- Fallback if no username
  IF target_username IS NULL OR target_username = '' THEN
    -- If no email, use phone-based username
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
      target_username := COALESCE(split_part(NEW.email, '@', 1), 'user');
    ELSE
      target_username := 'user_' || substr(NEW.id::text, 1, 6);
    END IF;
  END IF;

  base_username := target_username;
  final_username := target_username;

  -- Get total user count to assign first user as admin
  SELECT COUNT(*) INTO user_count FROM profiles;

  -- Handle duplication with retry loop
  LOOP
    BEGIN
      INSERT INTO public.profiles (
        id, 
        username, 
        full_name, 
        email, 
        phone,
        dob, 
        city, 
        role, 
        created_at
      )
      VALUES (
        NEW.id,
        final_username,
        NULLIF(meta_full_name, ''),
        NEW.email,
        NEW.phone,
        parsed_dob,
        NULLIF(meta_city, ''),
        CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
        now()
      );
      
      -- If insert succeeds, exit loop
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- If username exists, append suffix and try again
      counter := counter + 1;
      final_username := base_username || counter || substr(md5(random()::text), 1, 4);
      -- Prevent infinite loop
      IF counter > 10 THEN
        final_username := base_username || '_' || substr(NEW.id::text, 1, 8);
        INSERT INTO public.profiles (id, username, email, phone, role, created_at)
        VALUES (
          NEW.id,
          final_username,
          NEW.email,
          NEW.phone,
          CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
          now()
        );
        EXIT;
      END IF;
    END;
  END LOOP;

  -- Record in history
  INSERT INTO public.username_history (user_id, username, changed_at)
  VALUES (NEW.id, final_username, now());

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one following Miaoda best practices
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Create the trigger on UPDATE of confirmed_at
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();
