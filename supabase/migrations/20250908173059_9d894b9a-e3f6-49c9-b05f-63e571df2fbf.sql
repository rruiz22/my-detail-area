-- Create order activity log table
CREATE TABLE public.order_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  user_id uuid,
  activity_type text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing activity logs
CREATE POLICY "Users can view activity for accessible orders" 
ON public.order_activity_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_activity_log.order_id 
    AND (is_admin() OR user_has_active_dealer_membership(auth.uid(), o.dealer_id))
  )
);

-- Create policy for inserting activity logs (system only)
CREATE POLICY "Allow system to insert activity logs" 
ON public.order_activity_log 
FOR INSERT 
WITH CHECK (true);

-- Create function to log order changes
CREATE OR REPLACE FUNCTION public.log_order_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  field_name text;
  old_val text;
  new_val text;
  change_description text;
BEGIN
  -- Log order creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_activity_log (
      order_id, 
      user_id, 
      activity_type, 
      description,
      metadata
    ) VALUES (
      NEW.id,
      auth.uid(),
      'order_created',
      'Order created',
      jsonb_build_object(
        'order_number', NEW.order_number,
        'customer_name', NEW.customer_name,
        'status', NEW.status
      )
    );
    RETURN NEW;
  END IF;

  -- Log order updates
  IF TG_OP = 'UPDATE' THEN
    -- Check status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.order_activity_log (
        order_id, user_id, activity_type, field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, auth.uid(), 'status_changed', 'status', OLD.status, NEW.status,
        'Order status changed from ' || OLD.status || ' to ' || NEW.status
      );
    END IF;

    -- Check priority change
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO public.order_activity_log (
        order_id, user_id, activity_type, field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, auth.uid(), 'priority_changed', 'priority', 
        COALESCE(OLD.priority, 'normal'), COALESCE(NEW.priority, 'normal'),
        'Priority changed from ' || COALESCE(OLD.priority, 'normal') || ' to ' || COALESCE(NEW.priority, 'normal')
      );
    END IF;

    -- Check assigned group change
    IF OLD.assigned_group_id IS DISTINCT FROM NEW.assigned_group_id THEN
      INSERT INTO public.order_activity_log (
        order_id, user_id, activity_type, field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, auth.uid(), 'assignment_changed', 'assigned_group_id',
        COALESCE(OLD.assigned_group_id::text, 'unassigned'), 
        COALESCE(NEW.assigned_group_id::text, 'unassigned'),
        'Assignment changed'
      );
    END IF;

    -- Check due date change
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO public.order_activity_log (
        order_id, user_id, activity_type, field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, auth.uid(), 'due_date_changed', 'due_date',
        COALESCE(OLD.due_date::text, 'not set'), 
        COALESCE(NEW.due_date::text, 'not set'),
        'Due date updated'
      );
    END IF;

    -- Check customer info changes
    IF OLD.customer_name IS DISTINCT FROM NEW.customer_name THEN
      INSERT INTO public.order_activity_log (
        order_id, user_id, activity_type, field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, auth.uid(), 'customer_updated', 'customer_name', OLD.customer_name, NEW.customer_name,
        'Customer name updated'
      );
    END IF;

    -- Check services changes
    IF OLD.services IS DISTINCT FROM NEW.services THEN
      INSERT INTO public.order_activity_log (
        order_id, user_id, activity_type, field_name, old_value, new_value, description,
        metadata
      ) VALUES (
        NEW.id, auth.uid(), 'services_updated', 'services', '', '',
        'Services updated',
        jsonb_build_object('old_services', OLD.services, 'new_services', NEW.services)
      );
    END IF;

    -- Check total amount changes
    IF OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
      INSERT INTO public.order_activity_log (
        order_id, user_id, activity_type, field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, auth.uid(), 'amount_updated', 'total_amount',
        COALESCE(OLD.total_amount::text, '0'), 
        COALESCE(NEW.total_amount::text, '0'),
        'Total amount updated'
      );
    END IF;

    -- Check notes changes
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
      INSERT INTO public.order_activity_log (
        order_id, user_id, activity_type, field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, auth.uid(), 'notes_updated', 'notes', 
        COALESCE(LEFT(OLD.notes, 50), ''), 
        COALESCE(LEFT(NEW.notes, 50), ''),
        'Notes updated'
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger for order activity logging
CREATE TRIGGER order_activity_trigger
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_activity();

-- Create index for better performance
CREATE INDEX idx_order_activity_log_order_id ON public.order_activity_log(order_id);
CREATE INDEX idx_order_activity_log_created_at ON public.order_activity_log(created_at DESC);