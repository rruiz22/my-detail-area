-- Set rruiz@lima.llc as system_admin
-- This gives full access to all dealerships and system administration functions

UPDATE public.profiles
SET
  role = 'system_admin',
  user_type = 'dealer',
  updated_at = NOW()
WHERE email = 'rruiz@lima.llc';

-- Verify the update was successful
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM public.profiles
  WHERE email = 'rruiz@lima.llc' AND role = 'system_admin';

  IF user_count = 1 THEN
    RAISE NOTICE 'SUCCESS: rruiz@lima.llc has been set as system_admin';
  ELSE
    RAISE WARNING 'WARNING: User rruiz@lima.llc not found or role not updated';
  END IF;
END $$;

-- Optional: Also ensure this user has access to all dealerships if needed
-- (System admins automatically have access via RLS policies, but this creates explicit membership)
INSERT INTO public.dealer_memberships (user_id, dealer_id, role, is_active, created_at)
SELECT
  p.id,
  d.id,
  'admin',
  true,
  NOW()
FROM public.profiles p
CROSS JOIN public.dealerships d
WHERE p.email = 'rruiz@lima.llc'
  AND d.status = 'active'
ON CONFLICT (user_id, dealer_id)
DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- Log this admin assignment for audit purposes
INSERT INTO public.user_audit_log (
  event_type,
  entity_type,
  entity_id,
  user_id,
  affected_user_email,
  metadata,
  created_at
)
SELECT
  'role_assigned',
  'user',
  p.id,
  p.id, -- Self-assignment for initial setup
  'rruiz@lima.llc',
  jsonb_build_object(
    'old_role', 'dealer_user',
    'new_role', 'system_admin',
    'reason', 'Initial system admin setup',
    'assigned_by', 'migration'
  ),
  NOW()
FROM public.profiles p
WHERE p.email = 'rruiz@lima.llc';