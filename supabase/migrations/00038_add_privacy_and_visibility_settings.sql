-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS read_receipts_enabled BOOLEAN DEFAULT true;

-- Create muted_users table
CREATE TABLE IF NOT EXISTS public.muted_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    muter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    muted_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(muter_id, muted_id)
);

-- Create restricted_users table
CREATE TABLE IF NOT EXISTS public.restricted_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restrictor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    restricted_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(restrictor_id, restricted_id)
);

-- Create close_friends table
CREATE TABLE IF NOT EXISTS public.close_friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- Enable RLS for new tables
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restricted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;

-- Policies for muted_users
CREATE POLICY "Users can see their own mutes" ON public.muted_users FOR SELECT USING (muter_id = auth.uid());
CREATE POLICY "Users can manage their own mutes" ON public.muted_users FOR ALL USING (muter_id = auth.uid());

-- Policies for restricted_users
CREATE POLICY "Users can see their own restrictions" ON public.restricted_users FOR SELECT USING (restrictor_id = auth.uid());
CREATE POLICY "Users can manage their own restrictions" ON public.restricted_users FOR ALL USING (restrictor_id = auth.uid());

-- Policies for close_friends
CREATE POLICY "Users can see their own close friends" ON public.close_friends FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own close friends" ON public.close_friends FOR ALL USING (user_id = auth.uid());
