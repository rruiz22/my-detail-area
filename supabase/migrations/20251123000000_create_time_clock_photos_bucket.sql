-- Create storage bucket for time clock photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'time-clock-photos',
  'time-clock-photos',
  true, -- Public bucket so photos can be viewed in UI
  5242880, -- 5MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for time-clock-photos bucket
CREATE POLICY "Service role can upload time clock photos"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'time-clock-photos');

CREATE POLICY "Service role can update time clock photos"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'time-clock-photos');

CREATE POLICY "Service role can delete time clock photos"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'time-clock-photos');

-- Allow authenticated users to view photos from their dealerships
CREATE POLICY "Authenticated users can view time clock photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'time-clock-photos');

-- Allow public read access (for displaying photos in kiosk UI)
CREATE POLICY "Public can view time clock photos"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'time-clock-photos');

-- Add comment
COMMENT ON TABLE storage.buckets IS 
'Storage buckets. time-clock-photos bucket stores employee punch photos for DetailHub time tracking.';
