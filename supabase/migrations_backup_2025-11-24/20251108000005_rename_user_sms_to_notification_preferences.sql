-- Rename user_sms_notification_preferences to user_notification_preferences
-- and add multi-channel support (in_app, email, sms, push)
-- Migration: 20251108000005_rename_user_sms_to_notification_preferences.sql
--
-- ARCHITECTURE: Level 3 of 3-level validation
-- This table stores individual user preferences for notification channels
-- User has final control over which channels they want to receive notifications on

-- =====================================================
-- STEP 1: Rename table
-- =====================================================

ALTER TABLE user_sms_notification_preferences
RENAME TO user_notification_preferences;

-- =====================================================
-- STEP 2: Add multi-channel columns
-- =====================================================

-- Add columns for other notification channels
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false;

-- Rename sms_enabled to maintain clarity (already exists, just add comment)
COMMENT ON COLUMN user_notification_preferences.sms_enabled IS 'Global SMS notifications enabled/disabled for this user/module';
COMMENT ON COLUMN user_notification_preferences.in_app_enabled IS 'Global in-app notifications enabled/disabled for this user/module';
COMMENT ON COLUMN user_notification_preferences.email_enabled IS 'Global email notifications enabled/disabled for this user/module';
COMMENT ON COLUMN user_notification_preferences.push_enabled IS 'Global push notifications enabled/disabled for this user/module';

-- =====================================================
-- STEP 3: Update event_preferences structure
-- =====================================================

-- Migrate existing event_preferences from old format to new multi-channel format
-- OLD FORMAT: { "order_created": false, "status_changed": { "enabled": true, "statuses": [...] } }
-- NEW FORMAT: { "order_created": { "in_app": true, "email": false, "sms": false, "push": false }, ... }

DO $$
DECLARE
  preference_record RECORD;
  old_prefs JSONB;
  new_prefs JSONB;
  event_key TEXT;
  event_value JSONB;
  migrated_event JSONB;
BEGIN
  -- Iterate through all existing preferences
  FOR preference_record IN
    SELECT id, event_preferences FROM user_notification_preferences
  LOOP
    old_prefs := preference_record.event_preferences;
    new_prefs := '{}'::jsonb;

    -- Iterate through each event in old preferences
    FOR event_key, event_value IN
      SELECT * FROM jsonb_each(old_prefs)
    LOOP
      -- Check if old format (boolean or object with 'enabled' key)
      IF jsonb_typeof(event_value) = 'boolean' THEN
        -- Simple boolean format: convert to multi-channel object
        migrated_event := jsonb_build_object(
          'in_app', true,
          'email', false,
          'sms', event_value, -- Preserve SMS setting
          'push', false
        );
      ELSIF jsonb_typeof(event_value) = 'object' AND event_value ? 'enabled' THEN
        -- Object with 'enabled' key (like status_changed)
        migrated_event := jsonb_build_object(
          'in_app', true,
          'email', false,
          'sms', event_value->'enabled', -- Preserve SMS enabled setting
          'push', false,
          'config', event_value - 'enabled' -- Preserve other config (statuses, fields, etc.)
        );
      ELSE
        -- Already in new format or unknown format, keep as-is
        migrated_event := event_value;
      END IF;

      -- Add migrated event to new preferences
      new_prefs := new_prefs || jsonb_build_object(event_key, migrated_event);
    END LOOP;

    -- Update the record with migrated preferences
    UPDATE user_notification_preferences
    SET event_preferences = new_prefs
    WHERE id = preference_record.id;

  END LOOP;

  RAISE NOTICE 'Successfully migrated % user preference records to multi-channel format',
    (SELECT COUNT(*) FROM user_notification_preferences);
END $$;

-- =====================================================
-- STEP 4: Update indexes (rename references)
-- =====================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_user_sms_prefs_user_dealer;
DROP INDEX IF EXISTS idx_user_sms_prefs_module;
DROP INDEX IF EXISTS idx_user_sms_prefs_enabled;

-- Create new indexes with updated names
CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_user_dealer
ON user_notification_preferences(user_id, dealer_id);

CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_module
ON user_notification_preferences(module)
WHERE sms_enabled = true OR in_app_enabled = true OR email_enabled = true OR push_enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_channels
ON user_notification_preferences(user_id, module, dealer_id)
WHERE sms_enabled = true OR in_app_enabled = true OR email_enabled = true OR push_enabled = true;

-- =====================================================
-- STEP 5: Update trigger and function names
-- =====================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS set_sms_prefs_updated_at ON user_notification_preferences;

-- Drop old function
DROP FUNCTION IF EXISTS update_sms_prefs_updated_at();

-- Create new function with updated name
CREATE OR REPLACE FUNCTION update_user_notif_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger with updated name
CREATE TRIGGER set_user_notif_prefs_updated_at
BEFORE UPDATE ON user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_notif_prefs_updated_at();

-- =====================================================
-- STEP 6: Update RLS policies (no changes needed, just verify)
-- =====================================================

-- Policies are attached to table, so they carry over with rename
-- Just verify they still exist:

-- SELECT policy_name, cmd
-- FROM information_schema.table_privileges
-- WHERE table_name = 'user_notification_preferences';

-- =====================================================
-- STEP 7: Update table comment
-- =====================================================

COMMENT ON TABLE user_notification_preferences IS 'Stores user notification preferences for all channels (In-App, Email, SMS, Push) per module. Part of 3-level notification architecture: Follower → Role → User.';

-- =====================================================
-- Verification queries (for testing)
-- =====================================================

-- Run these after migration to verify:
--
-- -- Check table renamed successfully
-- SELECT COUNT(*) FROM user_notification_preferences;
--
-- -- Check new columns added
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_notification_preferences'
-- AND column_name IN ('in_app_enabled', 'email_enabled', 'push_enabled');
--
-- -- Check event_preferences migrated to new format
-- SELECT id, event_preferences
-- FROM user_notification_preferences
-- LIMIT 3;
--
-- -- Check indexes updated
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'user_notification_preferences';
