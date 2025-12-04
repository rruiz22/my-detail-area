-- =====================================================
-- PUSH NOTIFICATION SYSTEM - MANUAL TEST SUITE
-- =====================================================
-- Purpose: Validate dealer-configurable push notification system
-- Scope: Database schema, RPC functions, validation logic
-- Usage: Execute each test section manually and verify results
-- =====================================================

-- =====================================================
-- SETUP: Create test data
-- =====================================================

-- Test dealer ID (replace with your actual dealer_id)
-- Test user ID (replace with your actual user_id)
DO $$
DECLARE
  test_dealer_id INTEGER := 1; -- CHANGE THIS to your dealer ID
  test_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID; -- CHANGE THIS to your user ID
BEGIN
  RAISE NOTICE 'Test Configuration:';
  RAISE NOTICE '  Dealer ID: %', test_dealer_id;
  RAISE NOTICE '  User ID: %', test_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Update the variables above with your actual IDs before running tests.';
END $$;

-- =====================================================
-- TEST 1: Dealer Configuration (FASE 6.1)
-- =====================================================
-- Validates that dealer-level event configuration works correctly

-- Test 1.1: Create dealer configuration to DISABLE comment_added for sales_orders
INSERT INTO dealer_push_notification_preferences (
  dealer_id,
  module,
  event_type,
  enabled
) VALUES (
  1, -- CHANGE to your dealer_id
  'sales_orders',
  'comment_added',
  false -- DISABLED
) ON CONFLICT (dealer_id, module, event_type)
DO UPDATE SET enabled = false;

-- Test 1.2: Verify configuration was created
SELECT
  dealer_id,
  module,
  event_type,
  enabled,
  created_at
FROM dealer_push_notification_preferences
WHERE dealer_id = 1 -- CHANGE to your dealer_id
ORDER BY module, event_type;

-- Expected: Should show 'sales_orders' + 'comment_added' = false

-- Test 1.3: Test RPC function with DISABLED event
SELECT is_push_enabled_for_event(
  '00000000-0000-0000-0000-000000000000'::UUID, -- CHANGE to your user_id
  1, -- CHANGE to your dealer_id
  'sales_orders',
  'comment_added'
) AS should_be_false;

-- Expected: false (dealer has disabled this event)

-- Test 1.4: Test RPC function with event NOT in configuration (should default to enabled)
SELECT is_push_enabled_for_event(
  '00000000-0000-0000-0000-000000000000'::UUID, -- CHANGE to your user_id
  1, -- CHANGE to your dealer_id
  'sales_orders',
  'order_status_changed'
) AS should_be_true;

-- Expected: true (no configuration = enabled by default)

-- =====================================================
-- TEST 2: User Toggle (FASE 6.2)
-- =====================================================
-- Validates user-level push notification preferences

-- Test 2.1: Create user preferences with push DISABLED
INSERT INTO user_push_notification_preferences (
  user_id,
  push_enabled,
  allow_background,
  allow_sound,
  allow_vibration,
  quiet_hours_enabled
) VALUES (
  '00000000-0000-0000-0000-000000000000'::UUID, -- CHANGE to your user_id
  false, -- Push DISABLED
  true,
  true,
  true,
  false
) ON CONFLICT (user_id)
DO UPDATE SET push_enabled = false;

-- Test 2.2: Verify user preferences
SELECT
  user_id,
  push_enabled,
  allow_background,
  allow_sound,
  allow_vibration,
  quiet_hours_enabled
FROM user_push_notification_preferences
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID; -- CHANGE to your user_id

-- Expected: push_enabled = false

-- Test 2.3: Test RPC with user push disabled
SELECT is_push_enabled_for_event(
  '00000000-0000-0000-0000-000000000000'::UUID, -- CHANGE to your user_id
  1, -- CHANGE to your dealer_id
  'sales_orders',
  'order_status_changed'
) AS should_be_false_user_disabled;

-- Expected: false (user has disabled push notifications)

-- Test 2.4: Re-enable user push notifications
UPDATE user_push_notification_preferences
SET push_enabled = true
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID; -- CHANGE to your user_id

-- Test 2.5: Verify now returns true
SELECT is_push_enabled_for_event(
  '00000000-0000-0000-0000-000000000000'::UUID, -- CHANGE to your user_id
  1, -- CHANGE to your dealer_id
  'sales_orders',
  'order_status_changed'
) AS should_be_true_user_enabled;

-- Expected: true (user re-enabled push)

-- =====================================================
-- TEST 3: Validation Cascade (FASE 6.3)
-- =====================================================
-- Validates all 5 layers of validation work correctly

-- Test 3.1: Layer 1 - Dealer disabled event
-- (Already tested in Test 1.3)

-- Test 3.2: Layer 2 - User disabled push globally
-- (Already tested in Test 2.3)

-- Test 3.3: Layer 3 - User has active FCM token
SELECT
  user_id,
  dealer_id,
  fcm_token,
  is_active,
  device_type,
  created_at
FROM fcm_tokens
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID -- CHANGE to your user_id
  AND dealer_id = 1 -- CHANGE to your dealer_id
  AND is_active = true;

-- Expected: At least one active token if you've registered

-- Test 3.4: Combined validation - all layers passing
-- Prerequisites:
--   - Dealer has NOT disabled the event (or no config exists)
--   - User has push_enabled = true
--   - User has at least one active FCM token
SELECT is_push_enabled_for_event(
  '00000000-0000-0000-0000-000000000000'::UUID, -- CHANGE to your user_id
  1, -- CHANGE to your dealer_id
  'sales_orders',
  'order_status_changed'
) AS all_layers_pass;

-- Expected: true if all conditions met

-- =====================================================
-- TEST 4: Quiet Hours (FASE 6.4)
-- =====================================================
-- Validates quiet hours logic (midnight-spanning ranges)

-- Test 4.1: Enable quiet hours for test user (22:00 - 08:00)
UPDATE user_push_notification_preferences
SET
  quiet_hours_enabled = true,
  quiet_hours_start = '22:00:00'::TIME,
  quiet_hours_end = '08:00:00'::TIME
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID; -- CHANGE to your user_id

-- Test 4.2: Verify quiet hours configuration
SELECT
  user_id,
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end
FROM user_push_notification_preferences
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID; -- CHANGE to your user_id

-- Expected: quiet_hours_enabled = true, start = 22:00:00, end = 08:00:00

-- Test 4.3: Test quiet hours logic (manual check based on current time)
-- NOTE: This is validated in the Edge Function, not at RPC level
-- The RPC function does NOT check quiet hours - only dealer/user config
-- Quiet hours are checked in send-notification Edge Function

-- To test quiet hours in Edge Function:
-- 1. Set quiet hours to current time ± 30 minutes
-- 2. Trigger a notification (e.g., add a comment to an order)
-- 3. Check edge_function_logs for "User is in quiet hours - blocking notification"

-- Test 4.4: Normal hours (not midnight-spanning) - 08:00 to 22:00
UPDATE user_push_notification_preferences
SET
  quiet_hours_enabled = true,
  quiet_hours_start = '08:00:00'::TIME,
  quiet_hours_end = '22:00:00'::TIME
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID; -- CHANGE to your user_id

-- Expected: Quiet hours are 08:00-22:00 (normal working hours)
-- Notifications BLOCKED between 08:00-22:00
-- Notifications ALLOWED between 22:00-08:00

-- =====================================================
-- TEST 5: Multiple Devices (FASE 6.5)
-- =====================================================
-- Validates user with multiple FCM tokens receives on all devices

-- Test 5.1: Count active tokens for user
SELECT
  user_id,
  dealer_id,
  COUNT(*) as active_token_count,
  array_agg(device_type) as device_types
FROM fcm_tokens
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID -- CHANGE to your user_id
  AND dealer_id = 1 -- CHANGE to your dealer_id
  AND is_active = true
GROUP BY user_id, dealer_id;

-- Expected: Count > 1 if user has multiple devices registered

-- Test 5.2: Get all active tokens for send-notification Edge Function
SELECT
  id,
  user_id,
  dealer_id,
  fcm_token,
  device_type,
  browser,
  os,
  is_active,
  created_at,
  last_used_at
FROM fcm_tokens
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID -- CHANGE to your user_id
  AND dealer_id = 1 -- CHANGE to your dealer_id
  AND is_active = true
ORDER BY created_at DESC;

-- Expected: List of all active tokens
-- Each token will receive the notification in parallel (Promise.allSettled)

-- Test 5.3: Test send-notification Edge Function with multiple tokens
-- This requires calling the Edge Function via HTTP:
-- POST https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/send-notification
-- Headers:
--   Authorization: Bearer YOUR_ANON_KEY
--   Content-Type: application/json
-- Body:
-- {
--   "userId": "00000000-0000-0000-0000-000000000000",
--   "dealerId": 1,
--   "title": "Test Multiple Devices",
--   "body": "This should arrive on all your devices",
--   "url": "/dashboard"
-- }

-- =====================================================
-- TEST 6: Edge Function Logs (Validation)
-- =====================================================
-- Check Edge Function logs for notification attempts

-- Test 6.1: Recent notification requests
SELECT
  id,
  function_name,
  level,
  message,
  data,
  created_at
FROM edge_function_logs
WHERE function_name = 'send-notification'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Log entries showing notification processing

-- Test 6.2: Check for quiet hours blocks
SELECT
  id,
  function_name,
  level,
  message,
  data,
  created_at
FROM edge_function_logs
WHERE function_name = 'send-notification'
  AND message ILIKE '%quiet hours%'
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Logs showing "Notification blocked by quiet hours" if tested

-- Test 6.3: Check notification logs
SELECT
  id,
  user_id,
  type,
  title,
  message,
  read,
  created_at
FROM notification_log
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID -- CHANGE to your user_id
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Notification logs showing recent notifications

-- =====================================================
-- CLEANUP: Reset test data
-- =====================================================

-- Cleanup 1: Remove test dealer configuration
DELETE FROM dealer_push_notification_preferences
WHERE dealer_id = 1 -- CHANGE to your dealer_id
  AND module = 'sales_orders'
  AND event_type = 'comment_added';

-- Cleanup 2: Reset user preferences to defaults
UPDATE user_push_notification_preferences
SET
  push_enabled = true,
  quiet_hours_enabled = false,
  quiet_hours_start = NULL,
  quiet_hours_end = NULL
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID; -- CHANGE to your user_id

-- Cleanup 3: Verify cleanup
SELECT 'Dealer config cleaned' AS status, COUNT(*) as remaining_configs
FROM dealer_push_notification_preferences
WHERE dealer_id = 1 -- CHANGE to your dealer_id
  AND module = 'sales_orders'
  AND event_type = 'comment_added'

UNION ALL

SELECT 'User preferences reset' AS status, COUNT(*) as user_count
FROM user_push_notification_preferences
WHERE user_id = '00000000-0000-0000-0000-000000000000'::UUID -- CHANGE to your user_id
  AND push_enabled = true
  AND quiet_hours_enabled = false;

-- Expected:
--   - Dealer config cleaned: 0 remaining_configs
--   - User preferences reset: 1 user_count

-- =====================================================
-- SUMMARY
-- =====================================================

-- Run this query to get a complete overview of the system state
SELECT
  'System Overview' as section,
  (SELECT COUNT(*) FROM dealer_push_notification_preferences) as dealer_configs,
  (SELECT COUNT(*) FROM user_push_notification_preferences) as user_preferences,
  (SELECT COUNT(*) FROM fcm_tokens WHERE is_active = true) as active_tokens,
  (SELECT COUNT(*) FROM notification_log) as total_notifications;

-- =====================================================
-- END OF TEST SUITE
-- =====================================================
