-- =====================================================
-- GET READY MODULE - COMPREHENSIVE ACTIVITY LOG
-- Enterprise-grade audit trail for all vehicle changes
-- Date: November 4, 2025
-- Version: 2 (Idempotent - can run multiple times)
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view activity for their dealerships" ON public.get_ready_vehicle_activity_log;
DROP POLICY IF EXISTS "System can insert activity" ON public.get_ready_vehicle_activity_log;
DROP POLICY IF EXISTS "Only admins can modify activity" ON public.get_ready_vehicle_activity_log;
DROP POLICY IF EXISTS "Only admins can delete activity" ON public.get_ready_vehicle_activity_log;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_log_vehicle_changes ON public.get_ready_vehicles;
DROP TRIGGER IF EXISTS trigger_log_work_item_activities ON public.get_ready_work_items;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_ready_activity_stats(BIGINT, INTEGER);
DROP FUNCTION IF EXISTS log_work_item_activities();
DROP FUNCTION IF EXISTS log_vehicle_changes();

-- Create activity log table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.get_ready_vehicle_activity_log (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL,
  -- Types: 'vehicle_created', 'vehicle_updated', 'vehicle_deleted',
  --        'step_changed', 'priority_changed', 'workflow_changed',
  --        'work_item_created', 'work_item_updated', 'work_item_completed',
  --        'work_item_approved', 'work_item_declined', 'work_item_deleted',
  --        'note_added', 'note_updated', 'note_deleted',
  --        'media_uploaded', 'media_deleted',
  --        'vendor_assigned', 'vendor_removed',
  --        'approval_requested', 'approval_granted', 'approval_rejected',
  --        'sla_warning', 'sla_critical', 'vehicle_completed'

  -- Actor information
  action_by UUID NOT NULL REFERENCES auth.users(id),
  action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Change tracking (for field updates)
  field_name TEXT,           -- Campo modificado (ej: 'priority', 'step_id', 'stock_number')
  old_value TEXT,            -- Valor anterior (human-readable)
  new_value TEXT,            -- Valor nuevo (human-readable)

  -- Human-readable description
  description TEXT NOT NULL,
  -- Ejemplo: "Priority changed from Normal to Urgent"
  --          "Work item 'Paint Touch-Up' approved by John Doe"

  -- Flexible metadata (JSONB para info adicional)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: {
  --   "work_item_id": "uuid",
  --   "work_item_title": "Paint Touch-Up",
  --   "step_name": "Detailing",
  --   "vendor_name": "ABC Auto Body",
  --   "approval_reason": "Approved within budget",
  --   "estimated_cost": 150.00
  -- }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_activity_type CHECK (
    activity_type IN (
      'vehicle_created', 'vehicle_updated', 'vehicle_deleted',
      'step_changed', 'priority_changed', 'workflow_changed',
      'work_item_created', 'work_item_updated', 'work_item_completed',
      'work_item_approved', 'work_item_declined', 'work_item_deleted',
      'note_added', 'note_updated', 'note_deleted',
      'media_uploaded', 'media_deleted',
      'vendor_assigned', 'vendor_removed',
      'approval_requested', 'approval_granted', 'approval_rejected',
      'sla_warning', 'sla_critical', 'vehicle_completed'
    )
  )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE (create if not exists)
-- =====================================================

-- Drop existing indexes first to avoid conflicts
DROP INDEX IF EXISTS idx_gr_activity_vehicle_id;
DROP INDEX IF EXISTS idx_gr_activity_dealer_id;
DROP INDEX IF EXISTS idx_gr_activity_type;
DROP INDEX IF EXISTS idx_gr_activity_action_by;
DROP INDEX IF EXISTS idx_gr_activity_created_at;
DROP INDEX IF EXISTS idx_gr_activity_dealer_type_date;
DROP INDEX IF EXISTS idx_gr_activity_metadata;

-- Primary lookup by vehicle
CREATE INDEX idx_gr_activity_vehicle_id
  ON public.get_ready_vehicle_activity_log(vehicle_id, created_at DESC);

-- Dealer-scoped queries
CREATE INDEX idx_gr_activity_dealer_id
  ON public.get_ready_vehicle_activity_log(dealer_id, created_at DESC);

-- Filter by activity type
CREATE INDEX idx_gr_activity_type
  ON public.get_ready_vehicle_activity_log(activity_type, created_at DESC);

-- User activity tracking
CREATE INDEX idx_gr_activity_action_by
  ON public.get_ready_vehicle_activity_log(action_by, created_at DESC);

-- Time-based queries (for reports and analytics)
CREATE INDEX idx_gr_activity_created_at
  ON public.get_ready_vehicle_activity_log(created_at DESC);

-- Composite index for filtered timeline views
CREATE INDEX idx_gr_activity_dealer_type_date
  ON public.get_ready_vehicle_activity_log(dealer_id, activity_type, created_at DESC);

-- GIN index for metadata JSONB queries
CREATE INDEX idx_gr_activity_metadata
  ON public.get_ready_vehicle_activity_log USING GIN (metadata);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.get_ready_vehicle_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can view activity for their dealerships
CREATE POLICY "Users can view activity for their dealerships"
  ON public.get_ready_vehicle_activity_log FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

-- System can insert activity (triggers)
CREATE POLICY "System can insert activity"
  ON public.get_ready_vehicle_activity_log FOR INSERT
  WITH CHECK (true);  -- Triggers run with SECURITY DEFINER

-- Only system admins can modify activity (prevent tampering)
CREATE POLICY "Only admins can modify activity"
  ON public.get_ready_vehicle_activity_log FOR UPDATE
  USING (is_system_admin(auth.uid()));

CREATE POLICY "Only admins can delete activity"
  ON public.get_ready_vehicle_activity_log FOR DELETE
  USING (is_system_admin(auth.uid()));

-- =====================================================
-- TRIGGERS: AUTO-LOG VEHICLE CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION log_vehicle_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_dealer_id BIGINT;
  v_old_step_name TEXT;
  v_new_step_name TEXT;
BEGIN
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  -- ========== INSERT: Vehicle Created ==========
  IF TG_OP = 'INSERT' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      NEW.id,
      v_dealer_id,
      'vehicle_created',
      auth.uid(),
      format('Vehicle added: %s %s %s (Stock: %s)',
        NEW.vehicle_year, NEW.vehicle_make, NEW.vehicle_model, NEW.stock_number),
      jsonb_build_object(
        'stock_number', NEW.stock_number,
        'vin', NEW.vin,
        'workflow_type', NEW.workflow_type,
        'priority', NEW.priority
      )
    );
    RETURN NEW;
  END IF;

  -- ========== UPDATE: Track Specific Changes ==========
  IF TG_OP = 'UPDATE' THEN

    -- 1. Step Changed
    IF OLD.step_id IS DISTINCT FROM NEW.step_id THEN
      -- Get step names for human-readable description
      SELECT name INTO v_old_step_name
        FROM get_ready_steps WHERE id = OLD.step_id;
      SELECT name INTO v_new_step_name
        FROM get_ready_steps WHERE id = NEW.step_id;

      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by,
        field_name, old_value, new_value, description, metadata
      ) VALUES (
        NEW.id, v_dealer_id, 'step_changed', auth.uid(),
        'step_id',
        COALESCE(v_old_step_name, 'None'),
        COALESCE(v_new_step_name, 'None'),
        format('Moved from "%s" to "%s"',
          COALESCE(v_old_step_name, 'None'),
          COALESCE(v_new_step_name, 'None')),
        jsonb_build_object(
          'old_step_id', OLD.step_id,
          'new_step_id', NEW.step_id,
          'old_step_name', v_old_step_name,
          'new_step_name', v_new_step_name
        )
      );
    END IF;

    -- 2. Priority Changed
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by,
        field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, v_dealer_id, 'priority_changed', auth.uid(),
        'priority', OLD.priority, NEW.priority,
        format('Priority changed from %s to %s',
          UPPER(OLD.priority), UPPER(NEW.priority))
      );
    END IF;

    -- 3. Workflow Type Changed
    IF OLD.workflow_type IS DISTINCT FROM NEW.workflow_type THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by,
        field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, v_dealer_id, 'workflow_changed', auth.uid(),
        'workflow_type', OLD.workflow_type, NEW.workflow_type,
        format('Workflow changed from %s to %s',
          UPPER(OLD.workflow_type), UPPER(NEW.workflow_type))
      );
    END IF;

    -- 4. Approval Status Changed
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
      IF NEW.approval_status = 'approved' THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description, metadata
        ) VALUES (
          NEW.id, v_dealer_id, 'approval_granted', auth.uid(),
          'Vehicle approval granted',
          jsonb_build_object(
            'approved_by', NEW.approved_by,
            'approved_at', NEW.approved_at,
            'approval_reason', NEW.approval_reason
          )
        );
      ELSIF NEW.approval_status = 'rejected' THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description, metadata
        ) VALUES (
          NEW.id, v_dealer_id, 'approval_rejected', auth.uid(),
          format('Vehicle approval rejected: %s', COALESCE(NEW.rejection_reason, 'No reason provided')),
          jsonb_build_object(
            'rejected_by', NEW.rejected_by,
            'rejected_at', NEW.rejected_at,
            'rejection_reason', NEW.rejection_reason
          )
        );
      END IF;
    END IF;

    -- 5. SLA Status Changed (Warning/Critical)
    IF OLD.sla_status IS DISTINCT FROM NEW.sla_status THEN
      IF NEW.sla_status = 'critical' THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description
        ) VALUES (
          NEW.id, v_dealer_id, 'sla_critical', auth.uid(),
          format('⚠️ SLA CRITICAL: Vehicle has been in current step for %s days',
            NEW.days_in_step)
        );
      ELSIF NEW.sla_status = 'warning' THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description
        ) VALUES (
          NEW.id, v_dealer_id, 'sla_warning', auth.uid(),
          format('⚠️ SLA WARNING: Vehicle approaching time limit (%s days)',
            NEW.days_in_step)
        );
      END IF;
    END IF;

    -- 6. Vehicle Completed
    IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        NEW.id, v_dealer_id, 'vehicle_completed', auth.uid(),
        format('✅ Vehicle completed (Total time: %s days)', NEW.days_to_frontline),
        jsonb_build_object(
          'days_to_frontline', NEW.days_to_frontline,
          'total_cost', NEW.total_holding_cost,
          'completed_at', NEW.completed_at
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  -- ========== DELETE: Soft Delete ==========
  IF TG_OP = 'DELETE' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      OLD.id, v_dealer_id, 'vehicle_deleted', auth.uid(),
      format('Vehicle removed: %s %s %s (Stock: %s)',
        OLD.vehicle_year, OLD.vehicle_make, OLD.vehicle_model, OLD.stock_number),
      jsonb_build_object('stock_number', OLD.stock_number, 'vin', OLD.vin)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on vehicles table
CREATE TRIGGER trigger_log_vehicle_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.get_ready_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_changes();

-- =====================================================
-- TRIGGERS: AUTO-LOG WORK ITEM CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION log_work_item_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  -- ========== INSERT: Work Item Created ==========
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

  -- ========== UPDATE: Track Changes ==========
  IF TG_OP = 'UPDATE' THEN

    -- 1. Approval Status Changed
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

    -- 2. Work Item Completed
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

    -- 3. Vendor Assigned/Changed
    IF OLD.vendor_id IS DISTINCT FROM NEW.vendor_id AND NEW.vendor_id IS NOT NULL THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id, v_dealer_id, 'vendor_assigned', auth.uid(),
        format('Vendor assigned to "%s"', NEW.title),
        jsonb_build_object(
          'work_item_id', NEW.id,
          'work_item_title', NEW.title,
          'vendor_id', NEW.vendor_id
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  -- ========== DELETE: Work Item Deleted ==========
  IF TG_OP = 'DELETE' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'work_item_deleted', auth.uid(),
      format('Work item deleted: %s', OLD.title),
      jsonb_build_object(
        'work_item_title', OLD.title,
        'work_type', OLD.work_type
      )
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on work items table
CREATE TRIGGER trigger_log_work_item_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.get_ready_work_items
  FOR EACH ROW
  EXECUTE FUNCTION log_work_item_activities();

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Function to get activity statistics for dashboard
CREATE OR REPLACE FUNCTION get_ready_activity_stats(p_dealer_id BIGINT, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_activities BIGINT,
  activities_today BIGINT,
  top_activity_type TEXT,
  most_active_user_id UUID,
  activity_trend JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
      MODE() WITHIN GROUP (ORDER BY activity_type) as top_type,
      MODE() WITHIN GROUP (ORDER BY action_by) as top_user
    FROM get_ready_vehicle_activity_log
    WHERE dealer_id = p_dealer_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  ),
  trend AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', date::DATE,
        'count', count
      ) ORDER BY date
    ) as trend_data
    FROM (
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM get_ready_vehicle_activity_log
      WHERE dealer_id = p_dealer_id
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
      GROUP BY DATE_TRUNC('day', created_at)
    ) daily
  )
  SELECT
    s.total,
    s.today,
    s.top_type,
    s.top_user,
    t.trend_data
  FROM stats s, trend t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE get_ready_vehicle_activity_log IS
  'Enterprise audit trail for all Get Ready vehicle and work item changes';

COMMENT ON COLUMN get_ready_vehicle_activity_log.activity_type IS
  'Type of activity performed (vehicle_created, step_changed, work_item_approved, etc.)';

COMMENT ON COLUMN get_ready_vehicle_activity_log.metadata IS
  'Flexible JSONB field for additional context and related entity data';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Get Ready Activity Log migration completed successfully!';
  RAISE NOTICE '📊 Table: get_ready_vehicle_activity_log';
  RAISE NOTICE '🔒 RLS: 4 policies enabled';
  RAISE NOTICE '⚡ Triggers: 2 automatic triggers created';
  RAISE NOTICE '📈 Analytics: get_ready_activity_stats() function ready';
  RAISE NOTICE '🎯 Next step: Test the Activity tab at /get-ready/activity';
END $$;
