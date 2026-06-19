-- Create media bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage.objects
CREATE POLICY "Public read for media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');
CREATE POLICY "Users can update own media" ON storage.objects FOR UPDATE TO authenticated USING (auth.uid() = owner);
CREATE POLICY "Users can delete own media" ON storage.objects FOR DELETE TO authenticated USING (auth.uid() = owner);
