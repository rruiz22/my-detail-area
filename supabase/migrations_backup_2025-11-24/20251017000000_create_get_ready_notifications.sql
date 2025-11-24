-- =====================================================
-- Get Ready: Real-time Notifications System
-- =====================================================
-- Description: Comprehensive notification system for SLA alerts,
--              approvals, bottlenecks, and status changes
-- Date: 2025-10-17
-- =====================================================

-- =====================================================
-- 1. CREATE ENUMS FOR NOTIFICATION TYPES
-- =====================================================

-- Notification type enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'sla_warning',
    'sla_critical',
    'approval_pending',
    'approval_approved',
    'approval_rejected',
    'bottleneck_detected',
    'bottleneck_resolved',
    'vehicle_status_change',
    'work_item_completed',
    'work_item_created',
    'step_completed',
    'system_alert'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notification priority enum
DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CREATE NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.get_ready_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id BIGINT NOT NULL,
  user_id UUID, -- NULL means all users in dealership
  notification_type notification_type NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'medium',

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_label TEXT, -- e.g., "View Vehicle", "Approve Now"
  action_url TEXT, -- e.g., "/get-ready/details?vehicle=123"

  -- Related entities
  related_vehicle_id UUID REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  related_step_id TEXT,
  related_work_item_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration

  CONSTRAINT fk_dealer FOREIGN KEY (dealer_id) REFERENCES public.dealerships(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_dealer_user ON public.get_ready_notifications(dealer_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.get_ready_notifications(dealer_id, user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.get_ready_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.get_ready_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.get_ready_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_vehicle ON public.get_ready_notifications(related_vehicle_id);

-- Add comment
COMMENT ON TABLE public.get_ready_notifications IS 'Real-time notifications for Get Ready module events, alerts, and status changes';

-- =====================================================
-- 3. CREATE USER NOTIFICATION PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Notification type preferences
  sla_warnings_enabled BOOLEAN NOT NULL DEFAULT true,
  sla_critical_enabled BOOLEAN NOT NULL DEFAULT true,
  approval_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  bottleneck_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  vehicle_status_enabled BOOLEAN NOT NULL DEFAULT true,
  work_item_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  step_completion_enabled BOOLEAN NOT NULL DEFAULT true,
  system_alerts_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Delivery preferences
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  desktop_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Quiet hours (optional)
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  -- Auto-dismiss settings
  auto_dismiss_read_after_days INTEGER DEFAULT 7,
  auto_dismiss_unread_after_days INTEGER DEFAULT 30,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.user_notification_preferences IS 'User-specific notification preferences and settings';

-- =====================================================
-- 4. CREATE RPC FUNCTIONS
-- =====================================================

-- Function: Get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
  p_user_id UUID,
  p_dealer_id BIGINT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.get_ready_notifications
  WHERE dealer_id = p_dealer_id
    AND (user_id = p_user_id OR user_id IS NULL)
    AND is_read = false
    AND dismissed_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function: Mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.get_ready_notifications
  SET
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE id = p_notification_id
    AND (user_id = p_user_id OR user_id IS NULL);

  RETURN FOUND;
END;
$$;

-- Function: Mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
  p_user_id UUID,
  p_dealer_id BIGINT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.get_ready_notifications
    SET
      is_read = true,
      read_at = NOW(),
      updated_at = NOW()
    WHERE dealer_id = p_dealer_id
      AND (user_id = p_user_id OR user_id IS NULL)
      AND is_read = false
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_updated_count FROM updated;

  RETURN COALESCE(v_updated_count, 0);
END;
$$;

-- Function: Dismiss notification
CREATE OR REPLACE FUNCTION public.dismiss_notification(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.get_ready_notifications
  SET
    dismissed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_notification_id
    AND (user_id = p_user_id OR user_id IS NULL);

  RETURN FOUND;
END;
$$;

-- Function: Delete old dismissed notifications (cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.get_ready_notifications
    WHERE dismissed_at IS NOT NULL
      AND dismissed_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted_count FROM deleted;

  RETURN COALESCE(v_deleted_count, 0);
END;
$$;

-- Function: Create notification helper
CREATE OR REPLACE FUNCTION public.create_get_ready_notification(
  p_dealer_id BIGINT,
  p_user_id UUID,
  p_type notification_type,
  p_priority notification_priority,
  p_title TEXT,
  p_message TEXT,
  p_action_label TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL,
  p_step_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.get_ready_notifications (
    dealer_id,
    user_id,
    notification_type,
    priority,
    title,
    message,
    action_label,
    action_url,
    related_vehicle_id,
    related_step_id,
    metadata
  )
  VALUES (
    p_dealer_id,
    p_user_id,
    p_type,
    p_priority,
    p_title,
    p_message,
    p_action_label,
    p_action_url,
    p_vehicle_id,
    p_step_id,
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- =====================================================
-- 5. CREATE TRIGGERS FOR AUTOMATIC NOTIFICATIONS
-- =====================================================

-- Trigger function: SLA warning notifications
CREATE OR REPLACE FUNCTION public.notify_sla_warning()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_step_name TEXT;
  v_vehicle_info TEXT;
BEGIN
  -- Get step name
  SELECT name INTO v_step_name
  FROM public.get_ready_steps
  WHERE id = NEW.step_id;

  -- Build vehicle info string
  v_vehicle_info := NEW.year || ' ' || NEW.make || ' ' || NEW.model;

  -- Create warning notification when SLA status changes to yellow
  IF OLD.sla_status = 'green' AND NEW.sla_status = 'yellow' THEN
    PERFORM public.create_get_ready_notification(
      NEW.dealer_id,
      NULL, -- Broadcast to all users
      'sla_warning'::notification_type,
      'medium'::notification_priority,
      'SLA Warning: ' || v_vehicle_info,
      'Vehicle in ' || v_step_name || ' is approaching SLA threshold (' || NEW.sla_hours_remaining || 'h remaining)',
      'View Vehicle',
      '/get-ready/details?vehicle=' || NEW.id::text,
      NEW.id,
      NEW.step_id,
      jsonb_build_object(
        'stock_number', NEW.stock_number,
        'sla_hours_remaining', NEW.sla_hours_remaining
      )
    );
  END IF;

  -- Create critical notification when SLA is violated
  IF OLD.sla_status IN ('green', 'yellow') AND NEW.sla_status = 'red' THEN
    PERFORM public.create_get_ready_notification(
      NEW.dealer_id,
      NULL, -- Broadcast to all users
      'sla_critical'::notification_type,
      'critical'::notification_priority,
      'SLA VIOLATION: ' || v_vehicle_info,
      'Vehicle in ' || v_step_name || ' has exceeded SLA target!',
      'Take Action',
      '/get-ready/details?vehicle=' || NEW.id::text,
      NEW.id,
      NEW.step_id,
      jsonb_build_object(
        'stock_number', NEW.stock_number,
        'hours_overdue', ABS(NEW.sla_hours_remaining)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to vehicles table
DROP TRIGGER IF EXISTS trigger_sla_warning_notification ON public.get_ready_vehicles;
CREATE TRIGGER trigger_sla_warning_notification
  AFTER UPDATE OF sla_status ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (OLD.sla_status IS DISTINCT FROM NEW.sla_status)
  EXECUTE FUNCTION public.notify_sla_warning();

-- Trigger function: Approval pending notifications
CREATE OR REPLACE FUNCTION public.notify_approval_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_vehicle_info TEXT;
BEGIN
  -- Build vehicle info string
  v_vehicle_info := NEW.year || ' ' || NEW.make || ' ' || NEW.model;

  -- Create notification when approval is required
  IF OLD.requires_approval = false AND NEW.requires_approval = true THEN
    PERFORM public.create_get_ready_notification(
      NEW.dealer_id,
      NULL, -- Broadcast to managers/admins
      'approval_pending'::notification_type,
      'high'::notification_priority,
      'Approval Required: ' || v_vehicle_info,
      'Vehicle requires approval before proceeding. Stock: ' || NEW.stock_number,
      'Review',
      '/get-ready/approvals',
      NEW.id,
      NEW.step_id,
      jsonb_build_object(
        'stock_number', NEW.stock_number
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to vehicles table
DROP TRIGGER IF EXISTS trigger_approval_pending_notification ON public.get_ready_vehicles;
CREATE TRIGGER trigger_approval_pending_notification
  AFTER UPDATE OF requires_approval ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (OLD.requires_approval IS DISTINCT FROM NEW.requires_approval)
  EXECUTE FUNCTION public.notify_approval_pending();

-- Trigger function: Step completion notifications
CREATE OR REPLACE FUNCTION public.notify_step_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_step_name TEXT;
  v_vehicle_info TEXT;
BEGIN
  -- Only trigger when step changes (vehicle moved)
  IF OLD.step_id IS DISTINCT FROM NEW.step_id THEN
    -- Get new step name
    SELECT name INTO v_step_name
    FROM public.get_ready_steps
    WHERE id = NEW.step_id;

    -- Build vehicle info string
    v_vehicle_info := NEW.year || ' ' || NEW.make || ' ' || NEW.model;

    -- Create notification for step completion
    PERFORM public.create_get_ready_notification(
      NEW.dealer_id,
      NULL, -- Broadcast to all users
      'vehicle_status_change'::notification_type,
      'low'::notification_priority,
      'Vehicle Moved: ' || v_vehicle_info,
      'Moved to ' || v_step_name || ' step',
      'View Vehicle',
      '/get-ready/details?vehicle=' || NEW.id::text,
      NEW.id,
      NEW.step_id,
      jsonb_build_object(
        'stock_number', NEW.stock_number,
        'from_step', OLD.step_id,
        'to_step', NEW.step_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to vehicles table
DROP TRIGGER IF EXISTS trigger_step_completion_notification ON public.get_ready_vehicles;
CREATE TRIGGER trigger_step_completion_notification
  AFTER UPDATE OF step_id ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (OLD.step_id IS DISTINCT FROM NEW.step_id)
  EXECUTE FUNCTION public.notify_step_completion();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.get_ready_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notifications for their dealership
CREATE POLICY "Users can view their dealership notifications"
  ON public.get_ready_notifications
  FOR SELECT
  USING (
    dealer_id IN (
      SELECT dm.dealer_id
      FROM public.dealer_memberships dm
      WHERE dm.user_id = auth.uid()
    )
    AND (
      user_id = auth.uid()
      OR user_id IS NULL -- Broadcast notifications
    )
  );

-- Policy: Users can update their own notifications
CREATE POLICY "Users can update their notifications"
  ON public.get_ready_notifications
  FOR UPDATE
  USING (
    dealer_id IN (
      SELECT dm.dealer_id
      FROM public.dealer_memberships dm
      WHERE dm.user_id = auth.uid()
    )
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- Policy: System can create notifications
CREATE POLICY "System can create notifications"
  ON public.get_ready_notifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can manage their notification preferences
CREATE POLICY "Users can manage their preferences"
  ON public.user_notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, UPDATE ON public.get_ready_notifications TO authenticated;
GRANT ALL ON public.user_notification_preferences TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_get_ready_notification TO authenticated;

-- =====================================================
-- 8. CREATE INDEXES FOR REAL-TIME SUBSCRIPTIONS
-- =====================================================

-- Index for real-time filtering
CREATE INDEX IF NOT EXISTS idx_notifications_realtime
  ON public.get_ready_notifications(dealer_id, user_id, created_at DESC)
  WHERE dismissed_at IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Get Ready Notifications System migration completed successfully';
  RAISE NOTICE 'Tables created: get_ready_notifications, user_notification_preferences';
  RAISE NOTICE 'Functions created: 5 RPC functions';
  RAISE NOTICE 'Triggers created: 3 automatic notification triggers';
  RAISE NOTICE 'RLS policies: Enabled with dealer-scoped access';
END $$;
