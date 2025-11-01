-- =====================================================
-- Fix is_system_admin function
-- Created: 2025-10-30
-- Purpose: Remove reference to non-existent is_system_admin column
-- =====================================================

-- Drop and recreate the is_system_admin function
DROP FUNCTION IF EXISTS is_system_admin(UUID);

-- Function to check if user is system admin
-- Only checks role field, not the non-existent is_system_admin column
CREATE OR REPLACE FUNCTION is_system_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'system_admin'
  );
$$;

COMMENT ON FUNCTION is_system_admin(UUID) IS 'Check if user has system_admin role. Used by RLS policies.';
