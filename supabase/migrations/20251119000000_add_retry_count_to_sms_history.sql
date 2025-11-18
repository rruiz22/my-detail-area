-- Add retry_count column to sms_send_history for automatic retry logic
-- Migration: 20251119000000_add_retry_count_to_sms_history.sql
-- Purpose: Track SMS delivery retry attempts (used by retry-failed-notifications Edge Function)

-- 1. Add retry_count column
ALTER TABLE sms_send_history
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- 2. Add CHECK constraint to limit retries (0-5 attempts)
ALTER TABLE sms_send_history
ADD CONSTRAINT check_retry_count_range CHECK (retry_count >= 0 AND retry_count <= 5);

-- 3. Update existing records to set retry_count = 0
UPDATE sms_send_history
SET retry_count = 0
WHERE retry_count IS NULL;

-- 4. Make column NOT NULL now that it's populated
ALTER TABLE sms_send_history
ALTER COLUMN retry_count SET NOT NULL;

-- 5. Create optimized index for retry queries
-- This index is used by retry-failed-notifications Edge Function
-- to efficiently find failed SMS that need retry
CREATE INDEX IF NOT EXISTS idx_sms_history_retry
ON sms_send_history(status, retry_count, sent_at)
WHERE status IN ('failed', 'undelivered');

-- 6. Add helpful comment
COMMENT ON COLUMN sms_send_history.retry_count IS 'Number of retry attempts for failed SMS deliveries (max 5)';

-- 7. Verify the column was added successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sms_send_history'
    AND column_name = 'retry_count'
  ) THEN
    RAISE EXCEPTION 'Migration failed: retry_count column was not created';
  END IF;

  RAISE NOTICE 'Migration successful: retry_count column added to sms_send_history';
END $$;
