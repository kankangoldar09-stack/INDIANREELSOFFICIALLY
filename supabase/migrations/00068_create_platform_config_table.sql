-- Create platform_config table for tokens and API keys
CREATE TABLE IF NOT EXISTS public.platform_config (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Policies: Only Super Admins can manage config
CREATE POLICY "Super Admins can manage platform config" ON public.platform_config
    FOR ALL TO authenticated
    USING (
        auth.uid() = '20bdb204-fe88-42c0-9787-728275517d07' OR -- @INDIANREELS_OFFICIALLY
        auth.uid() = '61499879-283a-485e-a36e-b203424a86d0'    -- @jeetyt09
    );

-- Also allow normal admins to SELECT if needed (commented out for now for maximum security)
-- CREATE POLICY "Admins can view platform config" ON public.platform_config FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
