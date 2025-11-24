-- ============================================================================
-- ADD AUTO-FOLLOW SETTINGS TO DEALER NOTIFICATION RULES
-- ============================================================================
-- Allow configuring which roles automatically become followers of orders
-- in specific modules when orders are created
-- ============================================================================

BEGIN;

-- Add auto_follow_enabled column to dealer_notification_rules
ALTER TABLE public.dealer_notification_rules
ADD COLUMN IF NOT EXISTS auto_follow_enabled BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.dealer_notification_rules.auto_follow_enabled IS
  'When true, users with this role automatically become followers of new orders in this module';

-- Create index for auto-follow queries
CREATE INDEX IF NOT EXISTS idx_dealer_notif_rules_auto_follow
  ON public.dealer_notification_rules(dealer_id, module, auto_follow_enabled)
  WHERE auto_follow_enabled = true AND enabled = true;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'AUTO-FOLLOW SETTINGS ADDED TO DEALER NOTIFICATION RULES';
  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✓ Added auto_follow_enabled column';
  RAISE NOTICE '  ✓ Created index for auto-follow queries';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage:';
  RAISE NOTICE '  - Enable auto_follow_enabled for a role in a module';
  RAISE NOTICE '  - Users with that role will automatically follow new orders';
  RAISE NOTICE '  - They will receive SMS notifications based on their preferences';
  RAISE NOTICE '======================================================================';
END $$;
