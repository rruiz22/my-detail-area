-- Create proper admin role with correct enum values
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

-- Create admin role permissions for all existing modules using correct enum values
INSERT INTO public.role_permissions (role_id, module, permission_level)
SELECT r.id, m.module, 'admin'::permission_level
FROM public.roles r
CROSS JOIN (
  VALUES 
    ('dashboard'::app_module),
    ('sales_orders'::app_module),
    ('service_orders'::app_module),
    ('recon_orders'::app_module),
    ('car_wash'::app_module),
    ('reports'::app_module),
    ('settings'::app_module),
    ('dealerships'::app_module),
    ('users'::app_module)
) m(module)
WHERE r.name = 'system_admin'
ON CONFLICT (role_id, module) DO UPDATE SET permission_level = 'admin'::permission_level;