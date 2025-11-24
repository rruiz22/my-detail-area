-- Fix security warning: Function Search Path Mutable
-- Update functions to explicitly set search_path

CREATE OR REPLACE FUNCTION user_can_update_order_status(user_uuid uuid, target_dealer_id bigint, current_status text, new_status text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM dealer_memberships dm
    JOIN dealer_membership_groups dmg ON dmg.membership_id = dm.id
    JOIN dealer_groups dg ON dg.id = dmg.group_id
    WHERE dm.user_id = user_uuid 
    AND dm.dealer_id = target_dealer_id
    AND dm.is_active = true
    AND dg.is_active = true
    AND (
      dg.permissions ? 'orders.update_status' OR
      (new_status = 'in_progress' AND dg.permissions ? 'orders.start') OR
      (new_status = 'completed' AND dg.permissions ? 'orders.complete') OR
      (new_status = 'cancelled' AND dg.permissions ? 'orders.cancel')
    )
  );
$$;

CREATE OR REPLACE FUNCTION user_has_module_access(user_uuid uuid, target_dealer_id bigint, module_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM dealer_memberships dm
    JOIN dealer_membership_groups dmg ON dmg.membership_id = dm.id
    JOIN dealer_groups dg ON dg.id = dmg.group_id
    WHERE dm.user_id = user_uuid 
    AND dm.dealer_id = target_dealer_id
    AND dm.is_active = true
    AND dg.is_active = true
    AND dg.permissions ? ('module.' || module_name)
  );
$$;

CREATE OR REPLACE FUNCTION get_user_accessible_dealers(user_uuid uuid)
RETURNS TABLE(
  id bigint,
  name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  country text,
  website text,
  status text,
  subscription_plan text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id, d.name, d.email, d.phone, d.address, d.city, d.state,
    d.zip_code, d.country, d.website, 
    d.status::text, d.subscription_plan::text
  FROM dealerships d
  WHERE EXISTS (
    SELECT 1 FROM dealer_memberships dm 
    WHERE dm.user_id = user_uuid 
    AND dm.dealer_id = d.id 
    AND dm.is_active = true
  )
  AND d.status = 'active'
  AND d.deleted_at IS NULL
  ORDER BY d.name;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_accessible_orders(user_uuid uuid, target_dealer_id bigint, scope_filter text DEFAULT 'all')
RETURNS TABLE(
  id uuid,
  order_number text,
  customer_name text,
  customer_email text,
  customer_phone text,
  vehicle_year integer,
  vehicle_make text,
  vehicle_model text,
  vehicle_vin text,
  vehicle_info text,
  stock_number text,
  order_type text,
  status text,
  priority text,
  services jsonb,
  total_amount numeric,
  sla_deadline timestamp with time zone,
  assigned_group_id uuid,
  created_by_group_id uuid,
  dealer_id bigint,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  completed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id, o.order_number, o.customer_name, o.customer_email, o.customer_phone,
    o.vehicle_year, o.vehicle_make, o.vehicle_model, o.vehicle_vin, o.vehicle_info,
    o.stock_number, o.order_type, o.status, o.priority, o.services, o.total_amount,
    o.sla_deadline, o.assigned_group_id, o.created_by_group_id, o.dealer_id,
    o.created_at, o.updated_at, o.completed_at
  FROM orders o
  WHERE o.dealer_id = target_dealer_id
  AND (
    -- User has dealer membership
    EXISTS (
      SELECT 1 FROM dealer_memberships dm 
      WHERE dm.user_id = user_uuid 
      AND dm.dealer_id = target_dealer_id 
      AND dm.is_active = true
    )
    AND (
      scope_filter = 'all' OR
      (scope_filter = 'group_only' AND (
        o.assigned_group_id IN (
          SELECT dmg.group_id 
          FROM dealer_memberships dm
          JOIN dealer_membership_groups dmg ON dmg.membership_id = dm.id
          WHERE dm.user_id = user_uuid AND dm.dealer_id = target_dealer_id
        ) OR
        o.created_by_group_id IN (
          SELECT dmg.group_id 
          FROM dealer_memberships dm
          JOIN dealer_membership_groups dmg ON dmg.membership_id = dm.id
          WHERE dm.user_id = user_uuid AND dm.dealer_id = target_dealer_id
        )
      ))
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_by = auth.uid();
    NEW.status_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;