-- Migration: Fix 406 error on sender_info query by making it publicly readable
-- Description: Updates is_public flag to allow RLS policy "Public can read public system settings"
--              to grant access to sender_info (company name, address) which is non-sensitive data
-- Impact: Eliminates 406 error on Dashboard load, reduces connection pool competition
-- Date: 2025-12-22

-- Update sender_info to be publicly readable
-- This is safe because sender info contains non-sensitive company information
-- (company name, address, phone) that should be accessible to all users
UPDATE system_settings
SET
  is_public = true,
  updated_at = NOW()
WHERE setting_key = 'sender_info';

-- Verify the update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM system_settings
    WHERE setting_key = 'sender_info' AND is_public = true
  ) THEN
    RAISE EXCEPTION 'sender_info is_public flag was not updated correctly';
  END IF;

  RAISE NOTICE '✅ sender_info is now publicly readable';
END $$;
