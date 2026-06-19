-- Create ENUM types
CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.follow_status AS ENUM ('pending', 'accepted');
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Profiles Table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  username text UNIQUE NOT NULL,
  full_name text,
  email text,
  phone text,
  bio text,
  profile_photo_url text,
  city text,
  dob date,
  role public.user_role DEFAULT 'user'::public.user_role,
  is_verified boolean DEFAULT false,
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Username History Table
CREATE TABLE public.username_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  username text NOT NULL,
  changed_at timestamptz DEFAULT now()
);

-- Posts Table
CREATE TABLE public.posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  caption text,
  location text,
  created_at timestamptz DEFAULT now()
);

-- Reels Table
CREATE TABLE public.reels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text,
  quality_pref text DEFAULT '1080p',
  created_at timestamptz DEFAULT now()
);

-- Stories Table
CREATE TABLE public.stories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Comments Table
CREATE TABLE public.comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT one_of_target CHECK ((post_id IS NOT NULL AND reel_id IS NULL) OR (post_id IS NULL AND reel_id IS NOT NULL))
);

-- Likes Table
CREATE TABLE public.likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id, reel_id)
);

-- Follows Table
CREATE TABLE public.follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status public.follow_status DEFAULT 'accepted'::public.follow_status,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Messages Table
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text,
  media_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Notifications Table
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  target_id uuid NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Saved Items Table
CREATE TABLE public.saved_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id, reel_id)
);

-- Watch History Table
CREATE TABLE public.watch_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE,
  watched_at timestamptz DEFAULT now()
);

-- Verification Requests Table
CREATE TABLE public.verification_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status public.verification_status DEFAULT 'pending'::public.verification_status,
  created_at timestamptz DEFAULT now()
);

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::public.user_role
  );
$$;

-- RLS Policies (Public by default for MVP speed, then tightened)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE username_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Posts viewable by all" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can insert posts" ON posts FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Reels viewable by all" ON reels FOR SELECT USING (true);
CREATE POLICY "Users can insert reels" ON reels FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Stories viewable by all" ON stories FOR SELECT USING (true);
CREATE POLICY "Users can insert stories" ON stories FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Comments viewable by all" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Likes viewable by all" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can insert likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Follows viewable by all" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can manage follows" ON follows FOR ALL USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Messages private to participants" ON messages FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Notifications viewable by recipient" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Saved items private to owner" ON saved_items FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Watch history private to owner" ON watch_history FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Username history private to owner" ON username_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Verification requests access" ON verification_requests FOR ALL USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Handle New User Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  default_username text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Use first part of email as default username or a random string
  default_username := COALESCE(split_part(NEW.email, '@', 1), 'user_' || substr(md5(random()::text), 1, 8));

  INSERT INTO public.profiles (id, username, email, role, created_at)
  VALUES (
    NEW.id,
    default_username,
    NEW.email,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    now()
  );

  -- Record first username in history
  INSERT INTO public.username_history (user_id, username, changed_at)
  VALUES (NEW.id, default_username, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- Enable Realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;
