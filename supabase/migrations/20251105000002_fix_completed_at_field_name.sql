-- =====================================================
-- FIX: completed_at Field Name in Work Item Activity Trigger
-- Date: November 5, 2025
-- Issue: Trigger was using 'completed_at' but the actual column is 'actual_end'
-- =====================================================

-- This migration fixes the column name mismatch in the activity log trigger
-- that was causing "record 'new' has no field 'completed_at'" errors when
-- completing work items.

-- =====================================================
-- STEP 1: Drop existing trigger
-- =====================================================

DROP TRIGGER IF EXISTS trigger_log_work_item_activities ON public.get_ready_work_items;

-- =====================================================
-- STEP 2: Drop existing function
-- =====================================================

DROP FUNCTION IF EXISTS log_work_item_activities();

-- =====================================================
-- STEP 3: Recreate function with correct column name
-- =====================================================

CREATE OR REPLACE FUNCTION log_work_item_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'work_item_created', auth.uid(),
      format('Work item created: %s', NEW.title),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'work_type', NEW.work_type,
        'approval_required', NEW.approval_required,
        'estimated_cost', NEW.estimated_cost,
        'estimated_hours', NEW.estimated_hours
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
      IF NEW.approval_status = 'approved' THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description, metadata
        ) VALUES (
          v_vehicle_id, v_dealer_id, 'work_item_approved', auth.uid(),
          format('✅ Work item approved: %s', NEW.title),
          jsonb_build_object(
            'work_item_id', NEW.id,
            'work_item_title', NEW.title,
            'approved_by', NEW.approved_by,
            'approved_at', NEW.approved_at,
            'approval_reason', NEW.approval_reason
          )
        );
      ELSIF NEW.approval_status = 'declined' THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description, metadata
        ) VALUES (
          v_vehicle_id, v_dealer_id, 'work_item_declined', auth.uid(),
          format('❌ Work item declined: %s - %s',
            NEW.title,
            COALESCE(NEW.rejection_reason, 'No reason provided')),
          jsonb_build_object(
            'work_item_id', NEW.id,
            'work_item_title', NEW.title,
            'declined_by', NEW.declined_by,
            'declined_at', NEW.declined_at,
            'rejection_reason', NEW.rejection_reason
          )
        );
      END IF;
    END IF;

    -- ✅ FIXED: Changed completed_at to actual_end (the actual column name)
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id, v_dealer_id, 'work_item_completed', auth.uid(),
        format('Work item completed: %s', NEW.title),
        jsonb_build_object(
          'work_item_id', NEW.id,
          'work_item_title', NEW.title,
          'actual_cost', NEW.actual_cost,
          'actual_hours', NEW.actual_hours,
          'actual_end', NEW.actual_end
        )
      );
    END IF;

    IF OLD.assigned_vendor_id IS DISTINCT FROM NEW.assigned_vendor_id AND NEW.assigned_vendor_id IS NOT NULL THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id, v_dealer_id, 'vendor_assigned', auth.uid(),
        format('Vendor assigned to "%s"', NEW.title),
        jsonb_build_object(
          'work_item_id', NEW.id,
          'work_item_title', NEW.title,
          'assigned_vendor_id', NEW.assigned_vendor_id
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'work_item_deleted', auth.uid(),
      format('Work item deleted: %s', OLD.title),
      jsonb_build_object('work_item_title', OLD.title)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- STEP 4: Recreate trigger
-- =====================================================

CREATE TRIGGER trigger_log_work_item_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.get_ready_work_items
  FOR EACH ROW
  EXECUTE FUNCTION log_work_item_activities();

-- =====================================================
-- VERIFICATION
-- =====================================================

COMMENT ON FUNCTION log_work_item_activities() IS
  'Fixed version: Uses actual_end instead of completed_at to match actual column name in get_ready_work_items table';
