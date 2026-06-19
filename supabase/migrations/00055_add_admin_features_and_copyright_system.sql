-- Add copyright_strikes to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS copyright_strikes INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_reply TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create their own feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all feedback" ON public.feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update feedback" ON public.feedback FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create copyright_strikes table for tracking
CREATE TABLE IF NOT EXISTS public.copyright_strikes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  content_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for copyright_strikes_log
ALTER TABLE public.copyright_strikes_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage copyright strikes" ON public.copyright_strikes_log FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Function to auto-ban user after 2 strikes
CREATE OR REPLACE FUNCTION public.check_copyright_strikes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.copyright_strikes >= 2 THEN
    NEW.is_banned := TRUE;
    NEW.ban_reason := 'Automatic ban due to 2 copyright strikes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-ban
DROP TRIGGER IF EXISTS trigger_check_copyright_strikes ON public.profiles;
CREATE TRIGGER trigger_check_copyright_strikes
BEFORE UPDATE OF copyright_strikes ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_copyright_strikes();

-- Grant verification permissions to INDIANREELS_OFFICIALLY
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = '20bdb204-fe88-42c0-9787-728275517d07';

-- Realtime for feedback
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
