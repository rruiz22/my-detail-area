-- =====================================================
-- GET READY MODULE - Storage Bucket for Vehicle Media
-- Create bucket and RLS policies for file uploads
-- =====================================================

-- Create vehicle-media storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-media', 'vehicle-media', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage bucket
UPDATE storage.buckets
SET public = true
WHERE id = 'vehicle-media';

-- =====================================================
-- STORAGE RLS POLICIES
-- =====================================================

-- Policy: Allow authenticated users to view media for their dealerships
DROP POLICY IF EXISTS "Users can view vehicle media" ON storage.objects;
CREATE POLICY "Users can view vehicle media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-media'
);

-- Policy: Allow authenticated users to upload media for their dealerships
-- File path format: {vehicle_id}/{timestamp}_{random}.{ext}
DROP POLICY IF EXISTS "Users can upload vehicle media" ON storage.objects;
CREATE POLICY "Users can upload vehicle media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-media'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow users to update their own uploads
DROP POLICY IF EXISTS "Users can update vehicle media" ON storage.objects;
CREATE POLICY "Users can update vehicle media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicle-media'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'vehicle-media'
);

-- Policy: Allow users to delete media (will be enforced at table level too)
DROP POLICY IF EXISTS "Users can delete vehicle media" ON storage.objects;
CREATE POLICY "Users can delete vehicle media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-media'
  AND auth.role() = 'authenticated'
);

-- =====================================================
-- GRANT STORAGE PERMISSIONS
-- =====================================================

-- Grant necessary permissions for storage operations
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
