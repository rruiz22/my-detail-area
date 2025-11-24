-- Now add the missing permissions and create the new features
INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'dashboard'::app_module, 'admin'::permission_level
FROM roles r WHERE r.name = 'dealer_manager'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'sales_orders'::app_module, 'admin'::permission_level
FROM roles r WHERE r.name = 'dealer_manager'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'service_orders'::app_module, 'admin'::permission_level
FROM roles r WHERE r.name = 'dealer_manager'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'recon_orders'::app_module, 'admin'::permission_level
FROM roles r WHERE r.name = 'dealer_manager'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'car_wash'::app_module, 'admin'::permission_level
FROM roles r WHERE r.name = 'dealer_manager'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'reports'::app_module, 'admin'::permission_level
FROM roles r WHERE r.name = 'dealer_manager'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'settings'::app_module, 'write'::permission_level
FROM roles r WHERE r.name = 'dealer_manager'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'dealerships'::app_module, 'write'::permission_level
FROM roles r WHERE r.name = 'dealer_manager'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'users'::app_module, 'admin'::permission_level
FROM roles r WHERE r.name = 'dealer_manager'
ON CONFLICT (role_id, module) DO NOTHING;

-- Dealer User permissions
INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'dashboard'::app_module, 'read'::permission_level
FROM roles r WHERE r.name = 'dealer_user'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'sales_orders'::app_module, 'read'::permission_level
FROM roles r WHERE r.name = 'dealer_user'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'service_orders'::app_module, 'read'::permission_level
FROM roles r WHERE r.name = 'dealer_user'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'reports'::app_module, 'read'::permission_level
FROM roles r WHERE r.name = 'dealer_user'
ON CONFLICT (role_id, module) DO NOTHING;

-- Management permissions
INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'management'::app_module, 'admin'::permission_level
FROM roles r WHERE r.name = 'system_admin'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'management'::app_module, 'write'::permission_level
FROM roles r WHERE r.name = 'dealer_admin'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO role_permissions (role_id, module, permission_level) 
SELECT r.id, 'management'::app_module, 'write'::permission_level
FROM roles r WHERE r.name = 'dealer_manager'
ON CONFLICT (role_id, module) DO NOTHING;