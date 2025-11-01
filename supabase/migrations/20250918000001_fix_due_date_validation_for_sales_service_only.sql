-- Fix due date validation to only apply to sales and service orders on creation (INSERT only)
-- This migration modifies the existing trigger to be conditional based on order_type

-- Create new validation function that checks order type and operation
CREATE OR REPLACE FUNCTION public.validate_order_due_date_conditional(
  due_date_param timestamp with time zone,
  order_type_param text,
  operation_type text
)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only validate due date for sales and service orders on INSERT
  IF operation_type != 'INSERT' THEN
    RETURN TRUE; -- Skip validation on UPDATE
  END IF;

  -- Only validate for sales and service order types
  IF order_type_param NOT IN ('sales', 'service') THEN
    RETURN TRUE; -- Skip validation for other order types
  END IF;

  -- Allow null due dates (this is now optional for other order types)
  IF due_date_param IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if date is in the future (at least now)
  IF due_date_param <= NOW() THEN
    RETURN FALSE;
  END IF;

  -- Extract hour from the timestamp
  DECLARE
    due_hour INTEGER := EXTRACT(HOUR FROM due_date_param AT TIME ZONE 'America/New_York');
    due_day INTEGER := EXTRACT(DOW FROM due_date_param AT TIME ZONE 'America/New_York'); -- 0=Sunday, 1=Monday, ..., 6=Saturday
  BEGIN
    -- Check if it's Sunday (closed)
    IF due_day = 0 THEN
      RETURN FALSE;
    END IF;

    -- Check business hours based on day of week
    IF due_day = 6 THEN -- Saturday - 8 AM to 5 PM
      IF due_hour < 8 OR due_hour > 17 THEN
        RETURN FALSE;
      END IF;
    ELSE -- Monday-Friday - 8 AM to 6 PM
      IF due_hour < 8 OR due_hour > 18 THEN
        RETURN FALSE;
      END IF;
    END IF;

    -- Check if minutes are exactly 00 (hourly intervals only)
    IF EXTRACT(MINUTE FROM due_date_param) != 0 THEN
      RETURN FALSE;
    END IF;
  END;

  -- If it's today, check minimum advance time (1 hour)
  IF DATE(due_date_param AT TIME ZONE 'America/New_York') = DATE(NOW() AT TIME ZONE 'America/New_York') THEN
    IF due_date_param <= (NOW() + INTERVAL '1 hour') THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$function$;

-- Create new trigger function that uses conditional validation
CREATE OR REPLACE FUNCTION public.validate_order_due_date_conditional_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  operation_type text;
BEGIN
  -- Determine operation type
  IF TG_OP = 'INSERT' THEN
    operation_type := 'INSERT';
  ELSE
    operation_type := 'UPDATE';
  END IF;

  -- Use conditional validation
  IF NOT validate_order_due_date_conditional(NEW.due_date, NEW.order_type, operation_type) THEN
    RAISE EXCEPTION 'Invalid due date: must be future date during business hours (8 AM - 6 PM Monday-Friday, 8 AM - 5 PM Saturday) with minimum 1 hour advance notice';
  END IF;

  RETURN NEW;
END;
$function$;

-- Replace the existing trigger with the new conditional one
DROP TRIGGER IF EXISTS validate_order_due_date_trigger_v2 ON public.orders;
DROP TRIGGER IF EXISTS validate_due_date_trigger ON public.orders;

CREATE TRIGGER validate_order_due_date_conditional_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_due_date_conditional_trigger();

-- Add comment to document the change
COMMENT ON TRIGGER validate_order_due_date_conditional_trigger ON public.orders IS
'Validates due_date only for sales and service orders on INSERT operations. Skips validation for other order types and UPDATE operations.';