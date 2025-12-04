-- =====================================================
-- Data Migration: user_push_notification_preferences initialization
-- =====================================================
-- Purpose: Document that no data migration is needed
-- Reason: profiles.notification_push column no longer exists (removed in previous migration)
-- Status: user_push_notification_preferences table is correctly empty
-- Behavior: System uses fail-safe defaults (allow notifications) when no preferences exist
-- =====================================================

-- No migration needed - profiles.notification_push column does not exist
-- Users will configure their preferences through the UI when needed
-- Default behavior: If user has no preferences, notifications are allowed with default settings

-- Verify table exists and is ready for use
DO $$
DECLARE
  table_exists BOOLEAN;
  existing_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_push_notification_preferences'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'Table user_push_notification_preferences does not exist';
  END IF;

  -- Count existing records
  SELECT COUNT(*) INTO existing_count FROM user_push_notification_preferences;

  RAISE NOTICE 'user_push_notification_preferences table initialized:';
  RAISE NOTICE '  - Table exists: %', table_exists;
  RAISE NOTICE '  - Existing preferences: %', existing_count;
  RAISE NOTICE '  - Migration status: No data to migrate (profiles.notification_push removed)';
  RAISE NOTICE '  - Default behavior: Allow notifications if no preferences exist';
END $$;

-- Add comment documenting the table purpose
COMMENT ON TABLE user_push_notification_preferences IS
  'User-level push notification preferences. Initialized 2025-12-04.
   Controls sound, vibration, background notifications, and quiet hours per user.
   No data migration needed - users configure preferences through Profile UI.';
