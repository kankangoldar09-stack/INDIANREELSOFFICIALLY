-- Create user_apps table
CREATE TABLE IF NOT EXISTS public.user_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    preview_image_url TEXT,
    theme_config JSONB DEFAULT '{}'::jsonb,
    feature_config JSONB DEFAULT '{}'::jsonb,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create app_versions table for history
CREATE TABLE IF NOT EXISTS public.app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES public.user_apps(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Helper functions for policies
CREATE OR REPLACE FUNCTION public.can_manage_user_app(app_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_apps
        WHERE id = app_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for user_apps
CREATE POLICY "Users can create their own apps" ON public.user_apps
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own apps" ON public.user_apps
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own apps" ON public.user_apps
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own apps" ON public.user_apps
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Policies for app_versions
CREATE POLICY "Users can view versions of their apps" ON public.app_versions
    FOR SELECT TO authenticated
    USING (can_manage_user_app(app_id));

CREATE POLICY "Users can create versions of their apps" ON public.app_versions
    FOR INSERT TO authenticated
    WITH CHECK (can_manage_user_app(app_id));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_apps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_versions;
