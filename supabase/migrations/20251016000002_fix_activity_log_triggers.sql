-- =====================================================
-- FIX: Activity Log Triggers - Handle NULL auth.uid()
-- Date: 2025-10-16
-- Issue: auth.uid() returns NULL in trigger context
-- Solution: Make action_by nullable + use system user fallback
-- =====================================================

-- Step 1: Make action_by nullable (allow system actions)
ALTER TABLE public.get_ready_vehicle_activity_log
  ALTER COLUMN action_by DROP NOT NULL;

-- Step 2: Update trigger to handle NULL auth.uid()
CREATE OR REPLACE FUNCTION log_vehicle_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_dealer_id BIGINT;
  v_description TEXT;
  v_old_step_name TEXT;
  v_new_step_name TEXT;
  v_user_id UUID;
BEGIN
  v_dealer_id := NEW.dealer_id;
  v_user_id := auth.uid(); -- May be NULL in trigger context

  -- Log step changes
  IF OLD.step_id IS DISTINCT FROM NEW.step_id THEN
    -- Get step names for description
    SELECT name INTO v_old_step_name FROM get_ready_steps WHERE id = OLD.step_id;
    SELECT name INTO v_new_step_name FROM get_ready_steps WHERE id = NEW.step_id;

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description, metadata
    ) VALUES (
      NEW.id, v_dealer_id, 'step_changed', v_user_id, 'step_id',
      OLD.step_id::TEXT, NEW.step_id::TEXT,
      'Vehicle moved from ' || COALESCE(v_old_step_name, 'Unknown') || ' to ' || COALESCE(v_new_step_name, 'Unknown'),
      jsonb_build_object('old_step_name', v_old_step_name, 'new_step_name', v_new_step_name)
    );
  END IF;

  -- Log priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description
    ) VALUES (
      NEW.id, v_dealer_id, 'priority_changed', v_user_id, 'priority',
      OLD.priority, NEW.priority,
      'Priority changed from ' || OLD.priority || ' to ' || NEW.priority
    );
  END IF;

  -- Log workflow changes
  IF OLD.workflow_type IS DISTINCT FROM NEW.workflow_type THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description
    ) VALUES (
      NEW.id, v_dealer_id, 'workflow_changed', v_user_id, 'workflow_type',
      OLD.workflow_type, NEW.workflow_type,
      'Workflow changed from ' || OLD.workflow_type || ' to ' || NEW.workflow_type
    );
  END IF;

  -- Log stock number changes
  IF OLD.stock_number IS DISTINCT FROM NEW.stock_number THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description
    ) VALUES (
      NEW.id, v_dealer_id, 'stock_updated', v_user_id, 'stock_number',
      OLD.stock_number, NEW.stock_number,
      'Stock number updated from ' || OLD.stock_number || ' to ' || NEW.stock_number
    );
  END IF;

  -- Log assignment changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description
    ) VALUES (
      NEW.id, v_dealer_id, 'assignment_changed', v_user_id, 'assigned_to',
      COALESCE(OLD.assigned_to::TEXT, 'Unassigned'),
      COALESCE(NEW.assigned_to::TEXT, 'Unassigned'),
      'Assignment changed'
    );
  END IF;

  -- Log note changes
  IF OLD.notes IS DISTINCT FROM NEW.notes AND NEW.notes IS NOT NULL THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description
    ) VALUES (
      NEW.id, v_dealer_id, 'note_updated', v_user_id,
      'Note ' || CASE WHEN OLD.notes IS NULL THEN 'added' ELSE 'updated' END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Update work item trigger to handle NULL auth.uid()
CREATE OR REPLACE FUNCTION log_work_item_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_action_type TEXT;
  v_description TEXT;
  v_user_id UUID;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);
  v_user_id := auth.uid(); -- May be NULL in trigger context

  -- INSERT (new work item)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'work_item_created', v_user_id,
      'Work item created: ' || NEW.title,
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'work_type', NEW.work_type,
        'approval_required', NEW.approval_required
      )
    );
    RETURN NEW;
  END IF;

  -- UPDATE (status/approval changes)
  IF TG_OP = 'UPDATE' THEN
    -- Approval status changed
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
      IF NEW.approval_status = 'approved' THEN
        v_action_type := 'work_item_approved';
        v_description := 'Work item approved: ' || NEW.title;
      ELSIF NEW.approval_status = 'declined' THEN
        v_action_type := 'work_item_declined';
        v_description := 'Work item declined: ' || NEW.title;
      END IF;

      IF v_action_type IS NOT NULL THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description, metadata
        ) VALUES (
          v_vehicle_id, v_dealer_id, v_action_type, v_user_id, v_description,
          jsonb_build_object('work_item_id', NEW.id, 'work_item_title', NEW.title)
        );
      END IF;
    END IF;

    -- Work item completed
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id, v_dealer_id, 'work_item_completed', v_user_id,
        'Work item completed: ' || NEW.title,
        jsonb_build_object(
          'work_item_id', NEW.id,
          'work_item_title', NEW.title,
          'actual_cost', NEW.actual_cost,
          'actual_hours', NEW.actual_hours
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE
  IF TG_OP = 'DELETE' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'work_item_deleted', v_user_id,
      'Work item deleted: ' || OLD.title,
      jsonb_build_object('work_item_title', OLD.title)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
