-- Create show-icons storage bucket for show icons/logos
INSERT INTO storage.buckets (id, name, public) VALUES ('show-icons', 'show-icons', true);

-- Allow authenticated users to upload their own show icons
CREATE POLICY "Users can upload show icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'show-icons' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update their own show icons
CREATE POLICY "Users can update show icons"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'show-icons' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete their own show icons
CREATE POLICY "Users can delete show icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'show-icons' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to show icons
CREATE POLICY "Show icons are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'show-icons');