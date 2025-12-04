-- =====================================================
-- Enhance FCM Tokens Table
-- =====================================================
-- Purpose: Add device tracking metadata to fcm_tokens table
-- Changes: Add device_name, browser, os, last_used_at columns
-- Backward Compatible: All new columns are nullable
-- =====================================================

-- Add device tracking columns (if they don't exist)
DO $$
BEGIN
  -- Add device_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fcm_tokens'
      AND column_name = 'device_name'
  ) THEN
    ALTER TABLE fcm_tokens ADD COLUMN device_name TEXT;
  END IF;

  -- Add browser column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fcm_tokens'
      AND column_name = 'browser'
  ) THEN
    ALTER TABLE fcm_tokens ADD COLUMN browser TEXT;
  END IF;

  -- Add os column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fcm_tokens'
      AND column_name = 'os'
  ) THEN
    ALTER TABLE fcm_tokens ADD COLUMN os TEXT;
  END IF;

  -- Add last_used_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fcm_tokens'
      AND column_name = 'last_used_at'
  ) THEN
    ALTER TABLE fcm_tokens ADD COLUMN last_used_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for last_used_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_last_used ON fcm_tokens(last_used_at DESC NULLS LAST);

-- Create index for active tokens with user lookup
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_active ON fcm_tokens(user_id, is_active) WHERE is_active = true;

-- Add comment
COMMENT ON COLUMN fcm_tokens.device_name IS 'User-friendly device name (e.g., "My iPhone", "Work Laptop")';
COMMENT ON COLUMN fcm_tokens.browser IS 'Browser name (e.g., "Chrome", "Firefox", "Safari")';
COMMENT ON COLUMN fcm_tokens.os IS 'Operating system (e.g., "Windows 11", "macOS", "iOS")';
COMMENT ON COLUMN fcm_tokens.last_used_at IS 'Timestamp of last successful push notification delivery';
