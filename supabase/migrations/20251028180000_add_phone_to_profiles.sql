-- Add phone_number column to profiles table for SMS notifications
-- Migration: 20251028180000_add_phone_to_profiles.sql

-- Add phone_number column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.phone_number IS 'User mobile phone for SMS notifications (format: +1XXXXXXXXXX)';

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number
ON profiles(phone_number) WHERE phone_number IS NOT NULL;

-- Add constraint to validate phone format (basic validation)
ALTER TABLE profiles
ADD CONSTRAINT IF NOT EXISTS phone_number_format
CHECK (phone_number IS NULL OR phone_number ~ '^\+1[0-9]{10}$');
