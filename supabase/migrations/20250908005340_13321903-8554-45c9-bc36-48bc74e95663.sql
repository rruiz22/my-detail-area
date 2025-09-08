-- Add due_date field to orders table
ALTER TABLE public.orders 
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;

-- Create function to validate due date and time
CREATE OR REPLACE FUNCTION validate_order_due_date(due_date_param TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow null due dates
  IF due_date_param IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if date is in the future
  IF due_date_param <= NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Extract hour from the timestamp (in the database timezone)
  DECLARE
    due_hour INTEGER := EXTRACT(HOUR FROM due_date_param);
  BEGIN
    -- Check if time is within business hours (8 AM to 6 PM)
    IF due_hour < 8 OR due_hour >= 18 THEN
      RETURN FALSE;
    END IF;
    
    -- Check if minutes are exactly 00 (hourly intervals only)
    IF EXTRACT(MINUTE FROM due_date_param) != 0 THEN
      RETURN FALSE;
    END IF;
  END;
  
  -- If it's today, check minimum advance time (1 hour)
  IF DATE(due_date_param) = DATE(NOW()) THEN
    IF due_date_param <= (NOW() + INTERVAL '1 hour') THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create trigger to validate due_date on insert/update
CREATE OR REPLACE FUNCTION validate_order_due_date_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT validate_order_due_date(NEW.due_date) THEN
    RAISE EXCEPTION 'Invalid due date: must be future date during business hours (8 AM - 6 PM) with minimum 1 hour advance notice';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for orders table
DROP TRIGGER IF EXISTS validate_due_date_trigger ON public.orders;
CREATE TRIGGER validate_due_date_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_due_date_trigger();