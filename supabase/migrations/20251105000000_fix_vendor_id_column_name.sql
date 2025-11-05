-- =====================================================
-- FIX: Vendor ID Column Name in Activity Log Triggers
-- Date: November 5, 2025
-- Issue: Triggers were using 'vendor_id' but the actual column is 'assigned_vendor_id'
-- =====================================================

-- This migration fixes the column name mismatch in the activity log triggers
-- that was causing "record 'old' has no field 'vendor_id'" errors when
-- starting work items.

-- =====================================================
-- STEP 1: Drop existing triggers
-- =====================================================

DROP TRIGGER IF EXISTS trigger_log_vendor_removal ON public.get_ready_work_items;
DROP TRIGGER IF EXISTS trigger_log_work_item_activities ON public.get_ready_work_items;

-- =====================================================
-- STEP 2: Drop existing functions
-- =====================================================

DROP FUNCTION IF EXISTS log_vendor_removal();
DROP FUNCTION IF EXISTS log_work_item_activities();

-- =====================================================
-- STEP 3: Recreate log_vendor_removal() with correct column name
-- =====================================================

CREATE OR REPLACE FUNCTION log_vendor_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_old_vendor_name TEXT;
  v_new_vendor_name TEXT;
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

  -- Vendor removed: A → NULL
  IF OLD.assigned_vendor_id IS NOT NULL AND NEW.assigned_vendor_id IS NULL THEN

    -- Get old vendor name from dealership_contacts
    SELECT COALESCE(company_name, full_name, 'Unknown Vendor') INTO v_old_vendor_name
    FROM dealership_contacts
    WHERE id = OLD.assigned_vendor_id;

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'vendor_removed',
      auth.uid(),
      'assigned_vendor_id',
      v_old_vendor_name,
      'None',
      format('Vendor removed: %s', v_old_vendor_name),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'old_vendor_id', OLD.assigned_vendor_id,
        'old_vendor_name', v_old_vendor_name
      )
    );
  END IF;

  -- Vendor reassigned: A → B (log removal of A, assignment of B is handled by existing trigger)
  IF OLD.assigned_vendor_id IS NOT NULL AND NEW.assigned_vendor_id IS NOT NULL
     AND OLD.assigned_vendor_id != NEW.assigned_vendor_id THEN

    -- Get old and new vendor names
    SELECT COALESCE(company_name, full_name, 'Unknown Vendor') INTO v_old_vendor_name
    FROM dealership_contacts
    WHERE id = OLD.assigned_vendor_id;

    SELECT COALESCE(company_name, full_name, 'Unknown Vendor') INTO v_new_vendor_name
    FROM dealership_contacts
    WHERE id = NEW.assigned_vendor_id;

    -- Log removal of old vendor
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by,
      field_name, old_value, new_value, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'vendor_removed',
      auth.uid(),
      'assigned_vendor_id',
      v_old_vendor_name,
      v_new_vendor_name,
      format('Vendor reassigned from "%s" to "%s"', v_old_vendor_name, v_new_vendor_name),
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'old_vendor_id', OLD.assigned_vendor_id,
        'new_vendor_id', NEW.assigned_vendor_id,
        'old_vendor_name', v_old_vendor_name,
        'new_vendor_name', v_new_vendor_name,
        'is_reassignment', true
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- STEP 4: Recreate log_work_item_activities() with correct column name
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
          'completed_at', NEW.completed_at
        )
      );
    END IF;

    -- ✅ FIXED: Changed vendor_id to assigned_vendor_id
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
-- STEP 5: Recreate triggers
-- =====================================================

CREATE TRIGGER trigger_log_vendor_removal
  AFTER UPDATE ON public.get_ready_work_items
  FOR EACH ROW
  EXECUTE FUNCTION log_vendor_removal();

CREATE TRIGGER trigger_log_work_item_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.get_ready_work_items
  FOR EACH ROW
  EXECUTE FUNCTION log_work_item_activities();

-- =====================================================
-- VERIFICATION
-- =====================================================

COMMENT ON FUNCTION log_vendor_removal() IS
  'Fixed version: Uses assigned_vendor_id instead of vendor_id to match actual column name in get_ready_work_items table';

COMMENT ON FUNCTION log_work_item_activities() IS
  'Fixed version: Uses assigned_vendor_id instead of vendor_id to match actual column name in get_ready_work_items table';
