-- Remove temporary permissive policies and fix the real authentication issue
DROP POLICY IF EXISTS "temp_dealer_groups_all" ON public.dealer_groups;
DROP POLICY IF EXISTS "temp_dealer_membership_groups_all" ON public.dealer_membership_groups;

-- Create proper admin role and assign to a test user
INSERT INTO public.roles (id, name, display_name, description, user_type, is_system_role, is_active)
VALUES (
  gen_random_uuid(),
  'system_admin',
  'System Administrator', 
  'Full system access with all permissions',
  'dealer',
  true,
  true
) ON CONFLICT (name) DO NOTHING;

-- Create admin role permissions for all modules
INSERT INTO public.role_permissions (role_id, module, permission_level)
SELECT r.id, m.module, 'admin'::permission_level
FROM public.roles r
CROSS JOIN (
  VALUES 
    ('users'::app_module),
    ('dealerships'::app_module),
    ('orders'::app_module),
    ('services'::app_module),
    ('reports'::app_module),
    ('settings'::app_module)
) m(module)
WHERE r.name = 'system_admin'
ON CONFLICT (role_id, module) DO UPDATE SET permission_level = 'admin'::permission_level;

-- Create a test admin user profile (this will be for auth.users with email admin@test.com)
-- We'll handle the actual auth user creation separately
INSERT INTO public.profiles (id, email, first_name, last_name, user_type, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@test.com',
  'Admin',
  'User',
  'dealer',
  'admin'
) ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  user_type = EXCLUDED.user_type,
  role = EXCLUDED.role;

-- Assign system admin role to the test admin user
INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  r.id,
  '00000000-0000-0000-0000-000000000001',
  true
FROM public.roles r
WHERE r.name = 'system_admin'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;

-- Create dealer membership for admin user
INSERT INTO public.dealer_memberships (user_id, dealer_id, is_active, joined_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  5,
  true,
  now()
) ON CONFLICT DO NOTHING;