-- Robust handle_new_user with safer date handling and duplication management
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
    target_username := COALESCE(split_part(NEW.email, '@', 1), 'user');
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
        INSERT INTO public.profiles (id, username, email, role, created_at)
        VALUES (
          NEW.id,
          final_username,
          NEW.email,
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
