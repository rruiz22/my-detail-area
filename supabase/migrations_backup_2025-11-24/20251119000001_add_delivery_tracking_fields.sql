-- Add delivery tracking fields to sms_send_history
-- Migration: 20251119000001_add_delivery_tracking_fields.sql
-- Purpose: Track webhook delivery status updates from Twilio for SMS notifications

-- 1. Add webhook_received_at column (timestamp when Twilio webhook was received)
ALTER TABLE sms_send_history
ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMPTZ;

-- 2. Add delivery_status_updated_at column (timestamp when delivery status was last updated)
ALTER TABLE sms_send_history
ADD COLUMN IF NOT EXISTS delivery_status_updated_at TIMESTAMPTZ;

-- 3. Add delivery_error_code column (Twilio error code for failed deliveries)
ALTER TABLE sms_send_history
ADD COLUMN IF NOT EXISTS delivery_error_code TEXT;

-- 4. Create index for delivery tracking queries
CREATE INDEX IF NOT EXISTS idx_sms_history_delivery_tracking
ON sms_send_history(webhook_received_at, delivery_status_updated_at)
WHERE status IN ('delivered', 'failed', 'undelivered');

-- 5. Create index for untracked deliveries (sent but no webhook received)
CREATE INDEX IF NOT EXISTS idx_sms_history_pending_delivery
ON sms_send_history(sent_at)
WHERE status = 'sent' AND webhook_received_at IS NULL;

-- 6. Add helpful comments
COMMENT ON COLUMN sms_send_history.webhook_received_at IS 'Timestamp when Twilio delivery status webhook was received';
COMMENT ON COLUMN sms_send_history.delivery_status_updated_at IS 'Timestamp when delivery status was last updated (delivered/failed/undelivered)';
COMMENT ON COLUMN sms_send_history.delivery_error_code IS 'Twilio error code if SMS delivery failed (e.g., 30006 for landline)';

-- 7. Verify columns were added successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sms_send_history'
    AND column_name = 'webhook_received_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: webhook_received_at column was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sms_send_history'
    AND column_name = 'delivery_status_updated_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: delivery_status_updated_at column was not created';
  END IF;

  RAISE NOTICE 'Migration successful: delivery tracking fields added to sms_send_history';
END $$;
