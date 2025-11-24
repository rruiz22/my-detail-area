-- Update get_dealer_services_for_user function to filter services by module access
CREATE OR REPLACE FUNCTION public.get_dealer_services_for_user(p_dealer_id bigint)
 RETURNS TABLE(id uuid, dealer_id bigint, name text, description text, price numeric, category text, duration integer, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, assigned_groups uuid[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.dealer_id,
    ds.name,
    ds.description,
    ds.price,
    ds.category,
    ds.duration,
    ds.is_active,
    ds.created_at,
    ds.updated_at,
    COALESCE(
      ARRAY_AGG(dsg.group_id) FILTER (WHERE dsg.group_id IS NOT NULL),
      ARRAY[]::UUID[]
    ) as assigned_groups
  FROM dealer_services ds
  LEFT JOIN dealer_service_groups dsg ON dsg.service_id = ds.id
  WHERE ds.dealer_id = p_dealer_id
  AND user_has_dealer_membership(auth.uid(), ds.dealer_id)
  AND ds.is_active = true
  AND (
    -- Only show services if the corresponding module is enabled
    (ds.category = 'wash' AND dealership_has_module_access(p_dealer_id, 'car_wash')) OR
    (ds.category IN ('detail', 'protection', 'repair') AND dealership_has_module_access(p_dealer_id, 'service_orders')) OR
    ds.category = 'general' -- General services available in all modules
  )
  GROUP BY ds.id, ds.dealer_id, ds.name, ds.description, ds.price, ds.category, ds.duration, ds.is_active, ds.created_at, ds.updated_at
  ORDER BY ds.name;
END;
$function$;