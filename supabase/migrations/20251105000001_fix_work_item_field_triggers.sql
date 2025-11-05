-- =====================================================
-- FIX: Work Item Field Update Trigger Column Names
-- Date: November 5, 2025
-- Issue: Trigger was using incorrect column names (due_date, cost_estimate)
-- =====================================================

-- This migration fixes additional column name mismatches in the
-- log_work_item_field_updates trigger that was causing errors when
-- starting work items.

-- =====================================================
-- STEP 1: Drop existing trigger
-- =====================================================

DROP TRIGGER IF EXISTS trigger_log_work_item_field_updates ON public.get_ready_work_items;

-- =====================================================
-- STEP 2: Drop existing function
-- =====================================================

DROP FUNCTION IF EXISTS log_work_item_field_updates();

-- =====================================================
-- STEP 3: Recreate function with correct column names
-- =====================================================

CREATE OR REPLACE FUNCTION log_work_item_field_updates()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
BEGIN
  -- Only process UPDATEs
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  v_vehicle_id := NEW.vehicle_id;

  -- Get dealer_id from vehicle
  SELECT dealer_id INTO v_dealer_id
  FROM get_ready_vehicles
  WHERE id = v_vehicle_id;

  -- Title Changed
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'work_item_updated',
      auth.uid(),
      'title',
      OLD.title,
      NEW.title,
      format('Work item title changed from "%s" to "%s"', OLD.title, NEW.title),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'old_title', OLD.title,
        'new_title', NEW.title
      )
    );
  END IF;

  -- Description Changed
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'work_item_updated',
      auth.uid(),
      'description',
      LEFT(COALESCE(OLD.description, ''), 100),
      LEFT(COALESCE(NEW.description, ''), 100),
      'Work item description updated',
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'description_changed', true
      )
    );
  END IF;

  -- ✅ FIXED: Changed due_date to scheduled_end (the actual column name)
  IF OLD.scheduled_end IS DISTINCT FROM NEW.scheduled_end THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'work_item_updated',
      auth.uid(),
      'scheduled_end',
      OLD.scheduled_end::TEXT,
      NEW.scheduled_end::TEXT,
      format('Work item scheduled end changed from %s to %s',
        COALESCE(OLD.scheduled_end::TEXT, 'None'),
        COALESCE(NEW.scheduled_end::TEXT, 'None')),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'old_scheduled_end', OLD.scheduled_end,
        'new_scheduled_end', NEW.scheduled_end
      )
    );
  END IF;

  -- Scheduled Start Changed
  IF OLD.scheduled_start IS DISTINCT FROM NEW.scheduled_start THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'work_item_updated',
      auth.uid(),
      'scheduled_start',
      OLD.scheduled_start::TEXT,
      NEW.scheduled_start::TEXT,
      format('Work item scheduled start changed from %s to %s',
        COALESCE(OLD.scheduled_start::TEXT, 'None'),
        COALESCE(NEW.scheduled_start::TEXT, 'None')),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'old_scheduled_start', OLD.scheduled_start,
        'new_scheduled_start', NEW.scheduled_start
      )
    );
  END IF;

  -- Priority Changed
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'work_item_updated',
      auth.uid(),
      'priority',
      OLD.priority::TEXT,
      NEW.priority::TEXT,
      format('Work item priority changed from %s to %s',
        OLD.priority, NEW.priority),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title
      )
    );
  END IF;

  -- ✅ FIXED: Changed cost_estimate to estimated_cost (the actual column name)
  IF OLD.estimated_cost IS DISTINCT FROM NEW.estimated_cost THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'work_item_updated',
      auth.uid(),
      'estimated_cost',
      OLD.estimated_cost::TEXT,
      NEW.estimated_cost::TEXT,
      format('Work item estimated cost changed from $%s to $%s',
        COALESCE(OLD.estimated_cost::TEXT, '0'),
        COALESCE(NEW.estimated_cost::TEXT, '0')),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'old_cost', OLD.estimated_cost,
        'new_cost', NEW.estimated_cost
      )
    );
  END IF;

  -- Actual Cost Changed
  IF OLD.actual_cost IS DISTINCT FROM NEW.actual_cost THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'work_item_updated',
      auth.uid(),
      'actual_cost',
      OLD.actual_cost::TEXT,
      NEW.actual_cost::TEXT,
      format('Work item actual cost changed from $%s to $%s',
        COALESCE(OLD.actual_cost::TEXT, '0'),
        COALESCE(NEW.actual_cost::TEXT, '0')),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'old_actual_cost', OLD.actual_cost,
        'new_actual_cost', NEW.actual_cost
      )
    );
  END IF;

  -- Estimated Hours Changed
  IF OLD.estimated_hours IS DISTINCT FROM NEW.estimated_hours THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'work_item_updated',
      auth.uid(),
      'estimated_hours',
      OLD.estimated_hours::TEXT,
      NEW.estimated_hours::TEXT,
      format('Work item estimated hours changed from %s to %s',
        COALESCE(OLD.estimated_hours::TEXT, '0'),
        COALESCE(NEW.estimated_hours::TEXT, '0')),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'old_hours', OLD.estimated_hours,
        'new_hours', NEW.estimated_hours
      )
    );
  END IF;

  -- Actual Hours Changed
  IF OLD.actual_hours IS DISTINCT FROM NEW.actual_hours THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'work_item_updated',
      auth.uid(),
      'actual_hours',
      OLD.actual_hours::TEXT,
      NEW.actual_hours::TEXT,
      format('Work item actual hours changed from %s to %s',
        COALESCE(OLD.actual_hours::TEXT, '0'),
        COALESCE(NEW.actual_hours::TEXT, '0')),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'old_actual_hours', OLD.actual_hours,
        'new_actual_hours', NEW.actual_hours
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- STEP 4: Recreate trigger
-- =====================================================

CREATE TRIGGER trigger_log_work_item_field_updates
  AFTER UPDATE ON public.get_ready_work_items
  FOR EACH ROW
  EXECUTE FUNCTION log_work_item_field_updates();

-- =====================================================
-- VERIFICATION
-- =====================================================

COMMENT ON FUNCTION log_work_item_field_updates() IS
  'Fixed version: Uses correct column names (scheduled_end instead of due_date, estimated_cost instead of cost_estimate)';
