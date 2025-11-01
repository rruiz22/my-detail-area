-- Add sent_day column to sms_send_history for efficient daily rate limiting
-- Migration: 20251101000001_add_sent_day_to_sms_send_history.sql
-- Fixes: Edge Function error "column sent_day does not exist" (index.ts line 385)

-- 1. Add sent_day column (nullable initially to allow population)
ALTER TABLE sms_send_history
ADD COLUMN IF NOT EXISTS sent_day DATE;

-- 2. Populate existing records with derived date from sent_at
UPDATE sms_send_history
SET sent_day = CAST(sent_at AS DATE)
WHERE sent_day IS NULL;

-- 3. Make column NOT NULL now that it's populated
ALTER TABLE sms_send_history
ALTER COLUMN sent_day SET NOT NULL;

-- 4. Set default for new inserts
ALTER TABLE sms_send_history
ALTER COLUMN sent_day SET DEFAULT CURRENT_DATE;

-- 5. Create optimized index for daily rate limiting
-- This index is used by checkRateLimits() in send-order-sms-notification Edge Function
CREATE INDEX IF NOT EXISTS idx_sms_history_sent_day_rate_limit
ON sms_send_history(user_id, dealer_id, sent_day)
WHERE status IN ('sent', 'delivered');

-- 6. Create trigger to auto-populate sent_day from sent_at on insert
-- This ensures consistency even if sent_day is not explicitly provided
CREATE OR REPLACE FUNCTION set_sms_sent_day()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sent_day IS NULL THEN
    NEW.sent_day := CAST(NEW.sent_at AS DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS ensure_sms_sent_day ON sms_send_history;

CREATE TRIGGER ensure_sms_sent_day
BEFORE INSERT ON sms_send_history
FOR EACH ROW
EXECUTE FUNCTION set_sms_sent_day();

-- 7. Add helpful comment
COMMENT ON COLUMN sms_send_history.sent_day IS 'Date when SMS was sent (cached from sent_at for efficient daily rate limiting queries)';

-- 8. Verify the column was added successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sms_send_history'
    AND column_name = 'sent_day'
  ) THEN
    RAISE EXCEPTION 'Migration failed: sent_day column was not created';
  END IF;

  RAISE NOTICE 'Migration successful: sent_day column added to sms_send_history';
END $$;
