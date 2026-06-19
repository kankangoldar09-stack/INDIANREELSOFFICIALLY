-- Video Calls Table
CREATE TABLE public.video_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name TEXT NOT NULL UNIQUE,
    caller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'ended')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see their own calls" ON public.video_calls
    FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls" ON public.video_calls
    FOR INSERT WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own calls" ON public.video_calls
    FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_calls;
