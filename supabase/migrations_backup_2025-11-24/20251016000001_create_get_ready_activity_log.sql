-- =====================================================
-- GET READY MODULE - VEHICLE ACTIVITY LOG
-- Complete audit trail for vehicle changes
-- Date: 2025-10-16
-- =====================================================

-- =====================================================
-- PHASE 1: CREATE TABLE
-- =====================================================

-- Create activity log table
CREATE TABLE IF NOT EXISTS public.get_ready_vehicle_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL,
  -- Types: 'vehicle_created', 'vehicle_updated', 'step_changed',
  --        'work_item_created', 'work_item_approved', 'work_item_declined',
  --        'work_item_completed', 'work_item_deleted',
  --        'note_added', 'note_updated', 'media_uploaded',
  --        'vendor_assigned', 'priority_changed', 'workflow_changed',
  --        'stock_updated', 'assignment_changed'

  action_by UUID NOT NULL REFERENCES auth.users(id),
  action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Change tracking (for updates)
  field_name TEXT,           -- Campo modificado (ej: 'priority', 'step_id', 'stock_number')
  old_value TEXT,            -- Valor anterior
  new_value TEXT,            -- Valor nuevo
  description TEXT,          -- Descripción humanizada del cambio

  -- Metadata flexible (JSONB para info adicional)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: { "work_item_id": "...", "work_item_title": "Paint Touch-Up", ... }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PHASE 2: CREATE INDEXES
-- =====================================================

-- Índices para performance
CREATE INDEX idx_get_ready_activity_vehicle_id
  ON public.get_ready_vehicle_activity_log(vehicle_id);

CREATE INDEX idx_get_ready_activity_created_at
  ON public.get_ready_vehicle_activity_log(created_at DESC);

CREATE INDEX idx_get_ready_activity_type
  ON public.get_ready_vehicle_activity_log(activity_type);

CREATE INDEX idx_get_ready_activity_action_by
  ON public.get_ready_vehicle_activity_log(action_by);

-- =====================================================
-- PHASE 3: RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.get_ready_vehicle_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can view activity for their dealerships
CREATE POLICY "Users can view activity for their dealerships"
  ON public.get_ready_vehicle_activity_log FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

-- System can insert activity
CREATE POLICY "System can insert activity"
  ON public.get_ready_vehicle_activity_log FOR INSERT
  WITH CHECK (user_has_active_dealer_membership(auth.uid(), dealer_id));

-- =====================================================
-- PHASE 4: TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE public.get_ready_vehicle_activity_log IS
  'Audit trail of all changes to Get Ready vehicles and related entities';

COMMENT ON COLUMN public.get_ready_vehicle_activity_log.activity_type IS
  'Type of activity: vehicle_created, vehicle_updated, step_changed, work_item_created, etc.';

COMMENT ON COLUMN public.get_ready_vehicle_activity_log.metadata IS
  'Flexible JSON metadata for additional context (work_item_id, old_step_name, etc.)';

-- =====================================================
-- PHASE 5: TRIGGER FUNCTIONS
-- =====================================================

-- =====================================================
-- TRIGGER 1: Log Vehicle Changes
-- =====================================================

CREATE OR REPLACE FUNCTION log_vehicle_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_dealer_id BIGINT;
  v_description TEXT;
  v_old_step_name TEXT;
  v_new_step_name TEXT;
BEGIN
  v_dealer_id := NEW.dealer_id;

  -- Log step changes
  IF OLD.step_id IS DISTINCT FROM NEW.step_id THEN
    -- Get step names for description
    SELECT name INTO v_old_step_name FROM get_ready_steps WHERE id = OLD.step_id;
    SELECT name INTO v_new_step_name FROM get_ready_steps WHERE id = NEW.step_id;

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description, metadata
    ) VALUES (
      NEW.id, v_dealer_id, 'step_changed', auth.uid(), 'step_id',
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
      NEW.id, v_dealer_id, 'priority_changed', auth.uid(), 'priority',
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
      NEW.id, v_dealer_id, 'workflow_changed', auth.uid(), 'workflow_type',
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
      NEW.id, v_dealer_id, 'stock_updated', auth.uid(), 'stock_number',
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
      NEW.id, v_dealer_id, 'assignment_changed', auth.uid(), 'assigned_to',
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
      NEW.id, v_dealer_id, 'note_updated', auth.uid(),
      'Note ' || CASE WHEN OLD.notes IS NULL THEN 'added' ELSE 'updated' END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_vehicle_changes ON public.get_ready_vehicles;
CREATE TRIGGER trigger_log_vehicle_changes
  AFTER UPDATE ON public.get_ready_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_changes();

-- =====================================================
-- TRIGGER 2: Log Work Item Activities
-- =====================================================

CREATE OR REPLACE FUNCTION log_work_item_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_action_type TEXT;
  v_description TEXT;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  -- INSERT (new work item)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'work_item_created', auth.uid(),
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
          v_vehicle_id, v_dealer_id, v_action_type, auth.uid(), v_description,
          jsonb_build_object('work_item_id', NEW.id, 'work_item_title', NEW.title)
        );
      END IF;
    END IF;

    -- Work item completed
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id, v_dealer_id, 'work_item_completed', auth.uid(),
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
      v_vehicle_id, v_dealer_id, 'work_item_deleted', auth.uid(),
      'Work item deleted: ' || OLD.title,
      jsonb_build_object('work_item_title', OLD.title)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_work_item_activities ON public.get_ready_work_items;
CREATE TRIGGER trigger_log_work_item_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.get_ready_work_items
  FOR EACH ROW
  EXECUTE FUNCTION log_work_item_activities();
