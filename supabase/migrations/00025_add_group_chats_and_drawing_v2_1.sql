-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  avatar_url text,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create group members table
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Update messages table to support groups
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;
