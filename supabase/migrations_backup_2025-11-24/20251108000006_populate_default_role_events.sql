-- Populate default notification event configuration for common Custom Roles
-- Migration: 20251108000006_populate_default_role_events.sql
--
-- BUSINESS LOGIC:
-- - Sales/Service Advisors: Receive "completed" status notifications
-- - Detail Technicians: Do NOT receive "completed" (only in_progress)
-- - Managers: Receive all important notifications
--
-- This migration sets intelligent defaults based on role name patterns

-- =====================================================
-- Helper Function: Create default events for a role
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_notification_events_for_role(
  p_role_id UUID,
  p_role_name TEXT,
  p_module TEXT
) RETURNS void AS $$
DECLARE
  default_events JSONB;
  event RECORD;
BEGIN
  -- Determine default events based on role name
  -- ============================================

  -- SALES/SERVICE ADVISORS: Full notifications including completed
  IF p_role_name ~* '(sales|service).*(advisor|agent|representative|rep)' THEN
    default_events := '[
      {"event_type": "order_created", "enabled": false, "config": {}},
      {"event_type": "order_assigned", "enabled": true, "config": {}},
      {"event_type": "status_changed", "enabled": true, "config": {"allowed_statuses": ["completed", "in_progress", "cancelled"]}},
      {"event_type": "comment_added", "enabled": true, "config": {}},
      {"event_type": "attachment_added", "enabled": false, "config": {}},
      {"event_type": "follower_added", "enabled": false, "config": {}},
      {"event_type": "due_date_approaching", "enabled": true, "config": {"default_minutes_before": 30}},
      {"event_type": "overdue", "enabled": true, "config": {}},
      {"event_type": "priority_changed", "enabled": true, "config": {}}
    ]'::jsonb;

  -- MANAGERS (UC, Sales Manager, Service Manager): All important events
  ELSIF p_role_name ~* '(manager|supervisor|lead)' THEN
    default_events := '[
      {"event_type": "order_created", "enabled": true, "config": {}},
      {"event_type": "order_assigned", "enabled": true, "config": {}},
      {"event_type": "status_changed", "enabled": true, "config": {"allowed_statuses": ["completed", "in_progress", "cancelled", "pending"]}},
      {"event_type": "comment_added", "enabled": true, "config": {}},
      {"event_type": "attachment_added", "enabled": false, "config": {}},
      {"event_type": "follower_added", "enabled": false, "config": {}},
      {"event_type": "due_date_approaching", "enabled": true, "config": {"default_minutes_before": 60}},
      {"event_type": "overdue", "enabled": true, "config": {}},
      {"event_type": "priority_changed", "enabled": true, "config": {}}
    ]'::jsonb;

  -- DETAIL DEPARTMENT / CAR WASH: Limited notifications, NO "completed"
  ELSIF p_role_name ~* '(detail|wash|clean|technician|attendant)' THEN
    default_events := '[
      {"event_type": "order_created", "enabled": false, "config": {}},
      {"event_type": "order_assigned", "enabled": true, "config": {}},
      {"event_type": "status_changed", "enabled": true, "config": {"allowed_statuses": ["in_progress"]}},
      {"event_type": "comment_added", "enabled": false, "config": {}},
      {"event_type": "attachment_added", "enabled": false, "config": {}},
      {"event_type": "follower_added", "enabled": false, "config": {}},
      {"event_type": "due_date_approaching", "enabled": false, "config": {}},
      {"event_type": "overdue", "enabled": false, "config": {}},
      {"event_type": "priority_changed", "enabled": false, "config": {}}
    ]'::jsonb;

  -- DEFAULT for unknown roles: Minimal notifications
  ELSE
    default_events := '[
      {"event_type": "order_created", "enabled": false, "config": {}},
      {"event_type": "order_assigned", "enabled": true, "config": {}},
      {"event_type": "status_changed", "enabled": true, "config": {"allowed_statuses": ["completed"]}},
      {"event_type": "comment_added", "enabled": false, "config": {}},
      {"event_type": "attachment_added", "enabled": false, "config": {}},
      {"event_type": "follower_added", "enabled": false, "config": {}},
      {"event_type": "due_date_approaching", "enabled": true, "config": {"default_minutes_before": 30}},
      {"event_type": "overdue", "enabled": true, "config": {}},
      {"event_type": "priority_changed", "enabled": false, "config": {}}
    ]'::jsonb;
  END IF;

  -- Insert events for this role
  FOR event IN
    SELECT * FROM jsonb_array_elements(default_events)
  LOOP
    INSERT INTO role_notification_events (
      role_id,
      module,
      event_type,
      enabled,
      event_config
    )
    VALUES (
      p_role_id,
      p_module,
      event->>'event_type',
      (event->>'enabled')::boolean,
      (event->'config')::jsonb
    )
    ON CONFLICT (role_id, module, event_type) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created default notification events for role "%" in module "%"', p_role_name, p_module;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Populate defaults for ALL existing Custom Roles
-- =====================================================

DO $$
DECLARE
  role_record RECORD;
  module TEXT;
  modules TEXT[] := ARRAY['sales_orders', 'service_orders', 'recon_orders', 'car_wash'];
BEGIN
  RAISE NOTICE '=== Starting population of default notification events ===';

  -- For each existing custom role
  FOR role_record IN
    SELECT id, role_name, dealer_id
    FROM dealer_custom_roles
    WHERE is_active = true
  LOOP
    RAISE NOTICE 'Processing role: % (ID: %)', role_record.role_name, role_record.id;

    -- Create default events for each module
    FOREACH module IN ARRAY modules
    LOOP
      PERFORM create_default_notification_events_for_role(
        role_record.id,
        role_record.role_name,
        module
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE '=== Completed population of default notification events ===';
  RAISE NOTICE 'Total roles processed: %', (SELECT COUNT(*) FROM dealer_custom_roles WHERE is_active = true);
  RAISE NOTICE 'Total events created: %', (SELECT COUNT(*) FROM role_notification_events);
END $$;

-- =====================================================
-- Trigger: Auto-populate events for new Custom Roles
-- =====================================================

CREATE OR REPLACE FUNCTION auto_populate_role_notification_events()
RETURNS TRIGGER AS $$
DECLARE
  module TEXT;
  modules TEXT[] := ARRAY['sales_orders', 'service_orders', 'recon_orders', 'car_wash'];
BEGIN
  -- Only populate for active roles
  IF NEW.is_active = true THEN
    -- Create default events for each module
    FOREACH module IN ARRAY modules
    LOOP
      PERFORM create_default_notification_events_for_role(
        NEW.id,
        NEW.role_name,
        module
      );
    END LOOP;

    RAISE NOTICE 'Auto-populated notification events for new role: %', NEW.role_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on dealer_custom_roles
CREATE TRIGGER trigger_auto_populate_role_notification_events
AFTER INSERT ON dealer_custom_roles
FOR EACH ROW
EXECUTE FUNCTION auto_populate_role_notification_events();

-- =====================================================
-- Helper: Update user preferences based on new role events
-- =====================================================

CREATE OR REPLACE FUNCTION sync_user_prefs_with_role_events(
  p_user_id UUID,
  p_dealer_id INTEGER,
  p_module TEXT,
  p_role_id UUID
) RETURNS void AS $$
DECLARE
  role_events JSONB;
  user_prefs JSONB;
  event_record RECORD;
  updated_prefs JSONB;
BEGIN
  -- Get role's enabled events
  SELECT jsonb_object_agg(
    event_type,
    jsonb_build_object(
      'enabled', enabled,
      'config', event_config
    )
  ) INTO role_events
  FROM role_notification_events
  WHERE role_id = p_role_id
  AND module = p_module
  AND enabled = true;

  -- Get user's current preferences
  SELECT event_preferences INTO user_prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id
  AND dealer_id = p_dealer_id
  AND module = p_module;

  -- If user has no preferences yet, create defaults based on role
  IF user_prefs IS NULL THEN
    updated_prefs := '{}'::jsonb;

    FOR event_record IN
      SELECT event_type, enabled, event_config
      FROM role_notification_events
      WHERE role_id = p_role_id
      AND module = p_module
      AND enabled = true
    LOOP
      -- Create multi-channel preference with SMS enabled by default
      updated_prefs := updated_prefs || jsonb_build_object(
        event_record.event_type,
        jsonb_build_object(
          'in_app', true,
          'email', false,
          'sms', true, -- SMS enabled by default for enabled events
          'push', false,
          'config', event_record.event_config
        )
      );
    END LOOP;

    -- Insert new user preferences
    INSERT INTO user_notification_preferences (
      user_id,
      dealer_id,
      module,
      sms_enabled,
      in_app_enabled,
      event_preferences
    )
    VALUES (
      p_user_id,
      p_dealer_id,
      p_module,
      true,
      true,
      updated_prefs
    )
    ON CONFLICT (user_id, dealer_id, module) DO UPDATE
    SET event_preferences = updated_prefs;

    RAISE NOTICE 'Created default user preferences for user % in module %', p_user_id, p_module;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON FUNCTION create_default_notification_events_for_role IS 'Creates intelligent default notification event configuration based on Custom Role name patterns';
COMMENT ON FUNCTION auto_populate_role_notification_events IS 'Trigger function to automatically populate notification events when a new Custom Role is created';
COMMENT ON FUNCTION sync_user_prefs_with_role_events IS 'Helper function to sync user notification preferences with their role''s enabled events';

-- =====================================================
-- Verification queries (for testing)
-- =====================================================

-- Run these after migration to verify:
--
-- -- Check events created for each role
-- SELECT
--   dcr.role_name,
--   rne.module,
--   COUNT(*) as event_count,
--   COUNT(*) FILTER (WHERE rne.enabled = true) as enabled_count
-- FROM dealer_custom_roles dcr
-- LEFT JOIN role_notification_events rne ON dcr.id = rne.role_id
-- GROUP BY dcr.role_name, rne.module
-- ORDER BY dcr.role_name, rne.module;
--
-- -- Check specific event configuration for Sales Advisors
-- SELECT
--   dcr.role_name,
--   rne.event_type,
--   rne.enabled,
--   rne.event_config
-- FROM dealer_custom_roles dcr
-- INNER JOIN role_notification_events rne ON dcr.id = rne.role_id
-- WHERE dcr.role_name ~* 'sales.*advisor'
-- AND rne.module = 'sales_orders'
-- ORDER BY rne.event_type;
--
-- -- Verify Detail Technicians do NOT have "completed" status
-- SELECT
--   dcr.role_name,
--   rne.event_type,
--   rne.enabled,
--   rne.event_config->'allowed_statuses' as allowed_statuses
-- FROM dealer_custom_roles dcr
-- INNER JOIN role_notification_events rne ON dcr.id = rne.role_id
-- WHERE dcr.role_name ~* 'detail.*technician'
-- AND rne.event_type = 'status_changed';
