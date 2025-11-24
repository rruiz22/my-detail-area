-- =====================================================
-- Fix Notification Trigger Column Names
-- =====================================================
-- Description: Update trigger functions to use correct column names
--              (vehicle_year, vehicle_make, vehicle_model)
-- Date: 2025-10-17
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

  -- Build vehicle info string using correct column names
  v_vehicle_info := NEW.vehicle_year || ' ' || NEW.vehicle_make || ' ' || NEW.vehicle_model;

  -- Create warning notification when SLA status changes to yellow
  IF OLD.sla_status = 'on_track' AND NEW.sla_status = 'warning' THEN
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
  IF OLD.sla_status IN ('on_track', 'warning') AND NEW.sla_status = 'critical' THEN
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

-- Trigger function: Approval pending notifications
CREATE OR REPLACE FUNCTION public.notify_approval_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_vehicle_info TEXT;
BEGIN
  -- Build vehicle info string using correct column names
  v_vehicle_info := NEW.vehicle_year || ' ' || NEW.vehicle_make || ' ' || NEW.vehicle_model;

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

    -- Build vehicle info string using correct column names
    v_vehicle_info := NEW.vehicle_year || ' ' || NEW.vehicle_make || ' ' || NEW.vehicle_model;

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

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Fixed notification trigger functions to use correct column names';
  RAISE NOTICE 'Updated: notify_sla_warning, notify_approval_pending, notify_step_completion';
END $$;
