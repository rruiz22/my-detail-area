-- Fix the date validation function to properly handle timezone and hour validation
CREATE OR REPLACE FUNCTION public.validate_order_due_date_v2(due_date_param timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow null due dates
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

-- Update the trigger to use the new validation function
CREATE OR REPLACE FUNCTION public.validate_order_due_date_trigger_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT validate_order_due_date_v2(NEW.due_date) THEN
    RAISE EXCEPTION 'Invalid due date: must be future date during business hours (8 AM - 6 PM Monday-Friday, 8 AM - 5 PM Saturday) with minimum 1 hour advance notice';
  END IF;
  
  RETURN NEW;
END;
$function$;