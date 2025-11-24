-- Create sms_send_history table for tracking SMS sends and rate limiting
-- Migration: 20251028180002_create_sms_send_history.sql

-- Create table for SMS send history
CREATE TABLE IF NOT EXISTS sms_send_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash')),
  event_type TEXT NOT NULL, -- 'order_assigned', 'status_changed', 'comment_added', etc.
  entity_id TEXT, -- order ID
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  twilio_sid TEXT, -- Twilio message SID
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'undelivered')),
  error_message TEXT, -- Error details if failed
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  cost_cents INTEGER -- Twilio cost in cents
);

-- Indexes for rate limiting checks (using expression indexes)
CREATE INDEX IF NOT EXISTS idx_sms_history_rate_limit_hour
ON sms_send_history(user_id, dealer_id, date_trunc('hour', sent_at))
WHERE status IN ('sent', 'delivered');

CREATE INDEX IF NOT EXISTS idx_sms_history_rate_limit_day
ON sms_send_history(user_id, dealer_id, CAST(sent_at AS DATE))
WHERE status IN ('sent', 'delivered');

-- Indexes for analytics and reporting
CREATE INDEX IF NOT EXISTS idx_sms_history_dealer_date
ON sms_send_history(dealer_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_history_entity
ON sms_send_history(entity_id, event_type);

CREATE INDEX IF NOT EXISTS idx_sms_history_status
ON sms_send_history(status, sent_at DESC)
WHERE status = 'failed';

-- Index for user's SMS history view
CREATE INDEX IF NOT EXISTS idx_sms_history_user_recent
ON sms_send_history(user_id, sent_at DESC);

-- RLS Policies
ALTER TABLE sms_send_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own SMS history
CREATE POLICY "Users can view own SMS history"
ON sms_send_history
FOR SELECT
USING (user_id = auth.uid());

-- System can insert SMS history (service role only)
CREATE POLICY "Service role can insert SMS history"
ON sms_send_history
FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS

-- System admins can view all SMS history
CREATE POLICY "System admins can view all SMS history"
ON sms_send_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'system_admin'
  )
);

-- Dealer admins can view SMS history for their dealership
CREATE POLICY "Dealer admins can view dealership SMS history"
ON sms_send_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM dealer_memberships dm
    INNER JOIN dealer_custom_roles dcr ON dm.custom_role_id = dcr.id
    INNER JOIN role_module_permissions_new rmp ON dcr.id = rmp.role_id
    INNER JOIN module_permissions mp ON rmp.permission_id = mp.id
    WHERE dm.user_id = auth.uid()
    AND dm.dealer_id = sms_send_history.dealer_id
    AND dm.is_active = true
    AND mp.module = 'management'
    AND mp.permission_key = 'view_settings'
  )
);

-- Add helpful comments
COMMENT ON TABLE sms_send_history IS 'Tracks all SMS notifications sent for rate limiting, auditing, and cost analysis';
COMMENT ON COLUMN sms_send_history.cost_cents IS 'Cost in cents (USD) charged by Twilio for this SMS';
COMMENT ON COLUMN sms_send_history.twilio_sid IS 'Twilio Message SID for tracking delivery status via webhooks';

-- Create view for SMS analytics
CREATE OR REPLACE VIEW sms_analytics AS
SELECT
  dealer_id,
  module,
  event_type,
  DATE(sent_at) as sent_date,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  SUM(cost_cents) as total_cost_cents,
  AVG(cost_cents) as avg_cost_cents
FROM sms_send_history
GROUP BY dealer_id, module, event_type, DATE(sent_at);

COMMENT ON VIEW sms_analytics IS 'Aggregated SMS statistics by dealer, module, and event type for analytics dashboards';
