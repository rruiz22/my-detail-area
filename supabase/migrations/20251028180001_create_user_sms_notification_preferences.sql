-- Create user_sms_notification_preferences table for granular SMS control
-- Migration: 20251028180001_create_user_sms_notification_preferences.sql

-- Create table for storing user SMS notification preferences
CREATE TABLE IF NOT EXISTS user_sms_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  module TEXT NOT NULL, -- 'sales_orders', 'service_orders', 'recon_orders', 'car_wash'

  -- Global SMS settings
  sms_enabled BOOLEAN DEFAULT false,
  phone_number TEXT, -- Override from profiles.phone_number if needed

  -- Event-based preferences (JSONB for flexibility)
  event_preferences JSONB DEFAULT '{
    "order_created": false,
    "order_assigned": true,
    "status_changed": {
      "enabled": true,
      "statuses": ["in_progress", "completed"]
    },
    "field_updated": {
      "enabled": false,
      "fields": []
    },
    "comment_added": false,
    "attachment_added": false,
    "follower_added": false,
    "due_date_approaching": {
      "enabled": true,
      "minutes_before": 30
    },
    "overdue": true,
    "priority_changed": true
  }'::jsonb,

  -- Rate limiting per user
  max_sms_per_hour INTEGER DEFAULT 10 CHECK (max_sms_per_hour > 0 AND max_sms_per_hour <= 50),
  max_sms_per_day INTEGER DEFAULT 50 CHECK (max_sms_per_day > 0 AND max_sms_per_day <= 200),

  -- Quiet hours (no SMS during these times)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_module CHECK (module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash')),
  CONSTRAINT phone_number_format CHECK (phone_number IS NULL OR phone_number ~ '^\+1[0-9]{10}$'),
  UNIQUE(user_id, dealer_id, module)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_sms_prefs_user_dealer
ON user_sms_notification_preferences(user_id, dealer_id);

CREATE INDEX IF NOT EXISTS idx_user_sms_prefs_module
ON user_sms_notification_preferences(module) WHERE sms_enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_sms_prefs_enabled
ON user_sms_notification_preferences(sms_enabled, module, dealer_id) WHERE sms_enabled = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER set_sms_prefs_updated_at
BEFORE UPDATE ON user_sms_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_sms_prefs_updated_at();

-- RLS Policies
ALTER TABLE user_sms_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own SMS preferences
CREATE POLICY "Users can manage own SMS preferences"
ON user_sms_notification_preferences
FOR ALL
USING (user_id = auth.uid());

-- System admins can view all SMS preferences
CREATE POLICY "System admins can view all SMS preferences"
ON user_sms_notification_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'system_admin'
  )
);

-- Add helpful comments
COMMENT ON TABLE user_sms_notification_preferences IS 'Stores granular SMS notification preferences for users per module';
COMMENT ON COLUMN user_sms_notification_preferences.event_preferences IS 'JSONB object containing preferences for each event type (order_created, status_changed, etc.)';
COMMENT ON COLUMN user_sms_notification_preferences.max_sms_per_hour IS 'Rate limit: Maximum SMS notifications per hour (1-50)';
COMMENT ON COLUMN user_sms_notification_preferences.max_sms_per_day IS 'Rate limit: Maximum SMS notifications per day (1-200)';
