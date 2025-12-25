-- Create storage bucket for user assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_assets', 'user_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'user_assets');

-- Allow public read access
CREATE POLICY "Public read access for user_assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user_assets');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'user_assets');