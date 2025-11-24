-- Fix the view for effective permissions using a lateral join approach
CREATE OR REPLACE VIEW public.v_effective_permissions AS
SELECT 
  dm.user_id,
  dm.dealer_id,
  array_agg(DISTINCT perm_elem.value::text) as permissions
FROM public.dealer_memberships dm
JOIN public.dealer_membership_groups dmg ON dmg.membership_id = dm.id
JOIN public.dealer_groups dg ON dg.id = dmg.group_id
CROSS JOIN LATERAL jsonb_array_elements_text(dg.permissions) as perm_elem(value)
WHERE dm.is_active = true AND dg.is_active = true
GROUP BY dm.user_id, dm.dealer_id;