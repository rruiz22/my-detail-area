-- =====================================================
-- User Push Notification Preferences
-- =====================================================
-- Purpose: Store user-level push notification settings and preferences
-- Access: Each user can manage their own preferences
-- Scope: Per user (one row per user)
-- =====================================================

-- Create user_push_notification_preferences table
CREATE TABLE IF NOT EXISTS user_push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Master toggle
  push_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Advanced settings
  allow_background BOOLEAN NOT NULL DEFAULT true, -- Allow background notifications
  allow_sound BOOLEAN NOT NULL DEFAULT true,      -- Play notification sound
  allow_vibration BOOLEAN NOT NULL DEFAULT true,  -- Vibrate device

  -- Quiet hours (do not disturb)
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME, -- e.g., '22:00:00'
  quiet_hours_end TIME,   -- e.g., '08:00:00'

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one configuration per user
  CONSTRAINT user_push_notification_preferences_unique UNIQUE (user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_push_prefs_user ON user_push_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_prefs_enabled ON user_push_notification_preferences(push_enabled) WHERE push_enabled = true;

-- Enable RLS
ALTER TABLE user_push_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own preferences
CREATE POLICY "Users can view their own push preferences"
  ON user_push_notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Users can insert/update their own preferences
CREATE POLICY "Users can manage their own push preferences"
  ON user_push_notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER set_user_push_notification_preferences_updated_at
  BEFORE UPDATE ON user_push_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE user_push_notification_preferences IS 'User-level push notification settings including quiet hours and notification preferences';
