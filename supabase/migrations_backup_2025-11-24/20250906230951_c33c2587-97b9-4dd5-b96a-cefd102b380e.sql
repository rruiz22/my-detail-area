-- Primero, insertar roles predeterminados si no existen
INSERT INTO roles (name, display_name, description, user_type, is_system_role)
VALUES 
  ('dealer_admin', 'Administrador de Concesionario', 'Acceso completo para administradores del concesionario', 'dealer', true),
  ('dealer_manager', 'Gerente de Concesionario', 'Gestión operativa del concesionario', 'dealer', true),
  ('dealer_user', 'Usuario de Concesionario', 'Acceso básico para usuarios del concesionario', 'dealer', true),
  ('detail_super_manager', 'Super Administrador', 'Acceso completo al sistema', 'detail', true),
  ('detail_manager', 'Gerente de Detallado', 'Gestión de operaciones de detallado', 'detail', true),
  ('detail_technician', 'Técnico de Detallado', 'Operaciones de detallado', 'detail', true)
ON CONFLICT (name) DO NOTHING;

-- Insertar permisos predeterminados para cada rol
-- Permisos para dealer_admin
INSERT INTO role_permissions (role_id, module, permission_level)
SELECT r.id, m.module::app_module, m.level::permission_level
FROM roles r
CROSS JOIN (VALUES 
  ('dashboard', 'admin'),
  ('sales_orders', 'admin'),
  ('service_orders', 'admin'),
  ('recon_orders', 'admin'),
  ('car_wash', 'admin'),
  ('reports', 'admin'),
  ('settings', 'admin'),
  ('dealerships', 'write'),
  ('users', 'write')
) AS m(module, level)
WHERE r.name = 'dealer_admin'
ON CONFLICT (role_id, module) DO NOTHING;

-- Permisos para detail_super_manager (acceso completo)
INSERT INTO role_permissions (role_id, module, permission_level)
SELECT r.id, m.module::app_module, m.level::permission_level
FROM roles r
CROSS JOIN (VALUES 
  ('dashboard', 'admin'),
  ('sales_orders', 'admin'),
  ('service_orders', 'admin'),
  ('recon_orders', 'admin'),
  ('car_wash', 'admin'),
  ('reports', 'admin'),
  ('settings', 'admin'),
  ('dealerships', 'admin'),
  ('users', 'admin')
) AS m(module, level)
WHERE r.name = 'detail_super_manager'
ON CONFLICT (role_id, module) DO NOTHING;

-- Asignar rol de dealer_admin al usuario actual si es de tipo dealer
INSERT INTO user_role_assignments (user_id, role_id, assigned_by, is_active)
SELECT p.id, r.id, p.id, true
FROM profiles p
CROSS JOIN roles r
WHERE p.user_type = 'dealer' 
  AND r.name = 'dealer_admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura 
    WHERE ura.user_id = p.id AND ura.is_active = true
  );

-- Asignar rol de detail_super_manager al usuario actual si es de tipo detail  
INSERT INTO user_role_assignments (user_id, role_id, assigned_by, is_active)
SELECT p.id, r.id, p.id, true
FROM profiles p
CROSS JOIN roles r
WHERE p.user_type = 'detail' 
  AND r.name = 'detail_super_manager'
  AND NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura 
    WHERE ura.user_id = p.id AND ura.is_active = true
  );