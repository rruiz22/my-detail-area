-- =====================================================================================
-- MIGRATION: Create Profile Avatars Storage Policies
-- Description: Creates RLS policies for profile-avatars bucket
-- Date: 2025-10-31
-- Note: Run this AFTER creating the bucket (20251031000000_create_profile_avatars_bucket.sql)
-- =====================================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public Access for Profile Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- =====================================================================================
-- POLICY 1: Public Read Access
-- Allow anyone to view profile avatars (public bucket)
-- =====================================================================================
CREATE POLICY "Public Access for Profile Avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-avatars');

-- =====================================================================================
-- POLICY 2: Authenticated Users Can Upload
-- Users can only upload files to their own folder (user_id)
-- =====================================================================================
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================================================
-- POLICY 3: Authenticated Users Can Update
-- Users can only update files in their own folder (user_id)
-- =====================================================================================
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================================================
-- POLICY 4: Authenticated Users Can Delete
-- Users can only delete files from their own folder (user_id)
-- =====================================================================================
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================================================
-- VERIFICATION QUERY (Optional - run separately to verify)
-- =====================================================================================
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd
-- FROM pg_policies
-- WHERE tablename = 'objects'
--   AND policyname LIKE '%avatar%';
