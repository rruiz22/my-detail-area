-- =====================================================
-- Fix user_notification_preferences Primary Key
-- =====================================================
-- Description: Update primary key to composite (user_id, dealer_id)
--              to allow users to have preferences per dealership
-- Date: 2025-10-17
-- =====================================================

-- Drop existing constraint
ALTER TABLE public.user_notification_preferences
DROP CONSTRAINT IF EXISTS user_notification_preferences_pkey;

-- Add composite primary key
ALTER TABLE public.user_notification_preferences
ADD PRIMARY KEY (user_id, dealer_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id
ON public.user_notification_preferences(user_id);

-- Create index for faster lookups by dealer_id
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_dealer_id
ON public.user_notification_preferences(dealer_id);

-- Add unique constraint to ensure one preference per user per dealer
-- (This is already enforced by the primary key, but making it explicit)
COMMENT ON TABLE public.user_notification_preferences IS 'User-specific notification preferences per dealership';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Fixed user_notification_preferences primary key to composite (user_id, dealer_id)';
END $$;
