-- =====================================================================================
-- MIGRATION: Create Profile Avatars Storage Bucket
-- Description: Creates storage bucket for user profile photos with RLS policies
-- Date: 2025-10-31
-- =====================================================================================

-- Create the profile-avatars bucket (public access for reading)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true, -- Public read access
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- STORAGE POLICIES: Profile Avatars
-- Note: These policies need to be created in the Supabase Dashboard under Storage
-- due to permission requirements. Go to: Storage > profile-avatars > Policies
-- =====================================================================================

-- Policy 1: Public Access for Profile Avatars (SELECT)
-- Target: storage.objects FOR SELECT
-- Definition:
-- bucket_id = 'profile-avatars'

-- Policy 2: Users can upload own avatar (INSERT)
-- Target: storage.objects FOR INSERT
-- Definition:
-- bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text

-- Policy 3: Users can update own avatar (UPDATE)
-- Target: storage.objects FOR UPDATE
-- Definition:
-- bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text

-- Policy 4: Users can delete own avatar (DELETE)
-- Target: storage.objects FOR DELETE
-- Definition:
-- bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text
