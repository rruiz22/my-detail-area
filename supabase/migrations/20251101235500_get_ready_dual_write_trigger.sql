-- ============================================================================
-- GET READY DUAL-WRITE TRIGGER - Automatic Replication to notification_log
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-11-01
-- Purpose: Implement dual-write pattern for Get Ready notifications
--
-- Strategy:
--   - Create trigger on get_ready_notifications (AFTER INSERT)
--   - Automatically replicate each notification to notification_log
--   - Maintain same UUID for correlation across tables
--   - Graceful error handling (don't fail original insert)
--   - Enable gradual migration to unified notification system
--
-- Benefits:
--   - Non-invasive: Doesn't modify existing 3 Get Ready triggers
--   - Safe: Errors in replication won't block original operation
--   - Traceable: Same UUID enables cross-table correlation
--   - Testable: Can verify dual-write without affecting production
--
-- Migration Path:
--   Phase 1: This migration (dual-write active)
--   Phase 2: Frontend reads from notification_log for Get Ready
--   Phase 3: Deprecate get_ready_notifications reads
--   Phase 4: Remove get_ready_notifications table (data retained in notification_log)
-- ============================================================================

BEGIN;

-- ============================================================================
-- REPLICATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.replicate_get_ready_to_notification_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mapped_priority TEXT;
  v_entity_id TEXT;
  v_thread_id TEXT;
  v_target_channels JSONB;
BEGIN
  -- ============================================================================
  -- PRIORITY MAPPING: 4-level (Get Ready) → 5-level (notification_log)
  -- ============================================================================
  v_mapped_priority := CASE NEW.priority
    WHEN 'low' THEN 'low'
    WHEN 'medium' THEN 'normal'      -- Get Ready 'medium' → notification_log 'normal'
    WHEN 'high' THEN 'high'
    WHEN 'critical' THEN 'critical'
    ELSE 'normal'                     -- Default fallback
  END;

  -- ============================================================================
  -- ENTITY ID CONVERSION: UUID → TEXT (notification_log uses VARCHAR)
  -- ============================================================================
  v_entity_id := CASE
    WHEN NEW.related_vehicle_id IS NOT NULL THEN NEW.related_vehicle_id::TEXT
    ELSE NULL
  END;

  -- ============================================================================
  -- THREAD ID: Group notifications by vehicle (all updates for same vehicle)
  -- ============================================================================
  v_thread_id := CASE
    WHEN NEW.related_vehicle_id IS NOT NULL THEN 'vehicle_' || NEW.related_vehicle_id::TEXT
    ELSE NULL
  END;

  -- ============================================================================
  -- TARGET CHANNELS: Get Ready currently in-app only
  -- ============================================================================
  v_target_channels := '["in_app"]'::jsonb;

  -- ============================================================================
  -- REPLICATE TO NOTIFICATION_LOG
  -- ============================================================================
  BEGIN
    INSERT INTO public.notification_log (
      -- Identity (same UUID for correlation)
      id,

      -- Scoping (multi-tenant)
      user_id,
      dealer_id,

      -- Module context
      module,
      event,
      entity_type,
      entity_id,
      thread_id,

      -- Content
      title,
      message,
      action_url,
      action_label,

      -- Priority & Status
      priority,
      is_read,
      is_dismissed,

      -- Delivery
      target_channels,

      -- Metadata (preserve Get Ready metadata + add source tracking)
      metadata,

      -- Timestamps (preserve original created_at)
      created_at
    )
    VALUES (
      -- Identity: Use SAME UUID from get_ready_notifications
      NEW.id,

      -- Scoping: Direct mapping
      NEW.user_id,                              -- NULL = broadcast to dealership
      NEW.dealer_id,

      -- Module context
      'get_ready',                              -- Module identifier
      NEW.notification_type::text,              -- Event name (sla_warning, approval_pending, etc.)
      'get_ready_vehicle',                      -- Entity type
      v_entity_id,                              -- Entity ID (vehicle UUID as text)
      v_thread_id,                              -- Thread ID (group by vehicle)

      -- Content: Direct mapping
      NEW.title,
      NEW.message,
      NEW.action_url,
      NEW.action_label,

      -- Priority: Mapped 4→5 levels
      v_mapped_priority,

      -- Status: Default to unread/not dismissed
      false,                                    -- is_read
      false,                                    -- is_dismissed

      -- Delivery: In-app only for Get Ready
      v_target_channels,

      -- Metadata: Preserve original + add replication metadata
      jsonb_build_object(
        'source', 'get_ready_notifications',
        'original_priority', NEW.priority::text,
        'related_step_id', NEW.related_step_id,
        'related_work_item_id', NEW.related_work_item_id,
        'original_metadata', NEW.metadata
      ),

      -- Timestamps: Preserve original creation time
      NEW.created_at
    );

    -- Log successful replication for monitoring
    RAISE DEBUG 'Successfully replicated Get Ready notification % to notification_log', NEW.id;

  EXCEPTION
    WHEN unique_violation THEN
      -- If notification already exists (e.g., manual insert), skip silently
      RAISE WARNING 'Notification % already exists in notification_log (skipping replication)', NEW.id;

    WHEN foreign_key_violation THEN
      -- If referenced user/dealer doesn't exist, log and continue
      RAISE WARNING 'Foreign key violation replicating notification %: % (user_id: %, dealer_id: %)',
        NEW.id, SQLERRM, NEW.user_id, NEW.dealer_id;

    WHEN check_violation THEN
      -- If data violates notification_log constraints
      RAISE WARNING 'Check constraint violation replicating notification %: %', NEW.id, SQLERRM;

    WHEN OTHERS THEN
      -- Catch-all for any other errors
      RAISE WARNING 'Failed to replicate Get Ready notification % to notification_log: % (SQLSTATE: %)',
        NEW.id, SQLERRM, SQLSTATE;
  END;

  -- ============================================================================
  -- ALWAYS RETURN NEW (don't block original insert)
  -- ============================================================================
  RETURN NEW;
END;
$$;

-- ============================================================================
-- FUNCTION DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.replicate_get_ready_to_notification_log() IS
  'Automatically replicates Get Ready notifications to unified notification_log table. '
  'Implements dual-write pattern for safe migration. Uses same UUID for correlation. '
  'Graceful error handling ensures original insert always succeeds.';

-- ============================================================================
-- CREATE TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_replicate_get_ready_notifications ON public.get_ready_notifications;

CREATE TRIGGER trigger_replicate_get_ready_notifications
  AFTER INSERT ON public.get_ready_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.replicate_get_ready_to_notification_log();

-- ============================================================================
-- TRIGGER DOCUMENTATION
-- ============================================================================

COMMENT ON TRIGGER trigger_replicate_get_ready_notifications ON public.get_ready_notifications IS
  'Dual-write trigger: Automatically replicates each Get Ready notification to notification_log. '
  'Fires AFTER INSERT to ensure original operation succeeds first. '
  'Part of Get Ready notification system migration to unified notification_log.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- No explicit grants needed - function is SECURITY DEFINER and runs with creator privileges
-- Trigger executes automatically with sufficient permissions

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
  v_test_notification_id UUID;
  v_replicated_count INTEGER;
BEGIN
  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'GET READY DUAL-WRITE TRIGGER MIGRATION';
  RAISE NOTICE '======================================================================';
  RAISE NOTICE '';

  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'replicate_get_ready_to_notification_log'
  ) INTO v_function_exists;

  RAISE NOTICE '✓ Function exists: %', v_function_exists;

  -- Check trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_replicate_get_ready_notifications'
  ) INTO v_trigger_exists;

  RAISE NOTICE '✓ Trigger exists: %', v_trigger_exists;
  RAISE NOTICE '';

  -- Validation summary
  IF v_function_exists AND v_trigger_exists THEN
    RAISE NOTICE 'Status: ✅ DUAL-WRITE TRIGGER ACTIVE';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Monitor replication: Check notification_log for new Get Ready entries';
    RAISE NOTICE '  2. Verify same UUIDs: Compare IDs between tables';
    RAISE NOTICE '  3. Test notification flow: Create test Get Ready notifications';
    RAISE NOTICE '  4. Validate metadata: Ensure all fields mapped correctly';
    RAISE NOTICE '';
    RAISE NOTICE 'Monitoring Queries:';
    RAISE NOTICE '  -- Count replicated notifications:';
    RAISE NOTICE '  SELECT COUNT(*) FROM notification_log WHERE module = ''get_ready'';';
    RAISE NOTICE '';
    RAISE NOTICE '  -- Compare counts:';
    RAISE NOTICE '  SELECT ';
    RAISE NOTICE '    (SELECT COUNT(*) FROM get_ready_notifications) as gr_count,';
    RAISE NOTICE '    (SELECT COUNT(*) FROM notification_log WHERE module = ''get_ready'') as nl_count;';
    RAISE NOTICE '';
    RAISE NOTICE '  -- Find replication gaps:';
    RAISE NOTICE '  SELECT grn.id FROM get_ready_notifications grn';
    RAISE NOTICE '  LEFT JOIN notification_log nl ON grn.id = nl.id';
    RAISE NOTICE '  WHERE nl.id IS NULL;';
  ELSE
    RAISE WARNING 'Status: ❌ MIGRATION INCOMPLETE';
    RAISE WARNING 'Function exists: %', v_function_exists;
    RAISE WARNING 'Trigger exists: %', v_trigger_exists;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Field Mappings:';
  RAISE NOTICE '  get_ready_notifications → notification_log';
  RAISE NOTICE '  ══════════════════════════════════════════════';
  RAISE NOTICE '  id (UUID)                → id (same UUID)';
  RAISE NOTICE '  dealer_id                → dealer_id';
  RAISE NOTICE '  user_id                  → user_id (NULL = broadcast)';
  RAISE NOTICE '  notification_type        → event';
  RAISE NOTICE '  priority (4 levels)      → priority (5 levels)';
  RAISE NOTICE '    low                    →   low';
  RAISE NOTICE '    medium                 →   normal';
  RAISE NOTICE '    high                   →   high';
  RAISE NOTICE '    critical               →   critical';
  RAISE NOTICE '  title                    → title';
  RAISE NOTICE '  message                  → message';
  RAISE NOTICE '  action_url               → action_url';
  RAISE NOTICE '  action_label             → action_label';
  RAISE NOTICE '  related_vehicle_id       → entity_id';
  RAISE NOTICE '  [constant]               → entity_type (''get_ready_vehicle'')';
  RAISE NOTICE '  [constant]               → module (''get_ready'')';
  RAISE NOTICE '  [derived]                → thread_id (''vehicle_{id}'')';
  RAISE NOTICE '  [constant]               → target_channels ([''in_app''])';
  RAISE NOTICE '  metadata                 → metadata (enhanced)';
  RAISE NOTICE '  created_at               → created_at';
  RAISE NOTICE '';
  RAISE NOTICE 'Error Handling:';
  RAISE NOTICE '  ✓ Unique violations: Skip silently (already exists)';
  RAISE NOTICE '  ✓ Foreign key violations: Log warning, continue';
  RAISE NOTICE '  ✓ Check constraint violations: Log warning, continue';
  RAISE NOTICE '  ✓ All errors: Original insert ALWAYS succeeds';
  RAISE NOTICE '';
  RAISE NOTICE 'Safety Features:';
  RAISE NOTICE '  ✓ Non-blocking: Replication errors don''t fail original insert';
  RAISE NOTICE '  ✓ Idempotent: Can be reapplied safely (CREATE OR REPLACE)';
  RAISE NOTICE '  ✓ Correlatable: Same UUID enables tracking across tables';
  RAISE NOTICE '  ✓ Auditable: All metadata preserved for troubleshooting';
  RAISE NOTICE '======================================================================';
END $$;
