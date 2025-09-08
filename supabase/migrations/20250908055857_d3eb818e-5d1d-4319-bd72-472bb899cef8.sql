-- First, add 'management' to the app_module enum
ALTER TYPE app_module ADD VALUE 'management';

-- Now add the missing permissions and create the new features
INSERT INTO role_permissions (role_id, module, permission_level) VALUES
-- Dealer Manager permissions (currently has no permissions)
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'dashboard', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'sales_orders', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'service_orders', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'recon_orders', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'car_wash', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'reports', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'settings', 'write'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'dealerships', 'write'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'users', 'admin'),

-- Dealer User permissions (currently has no permissions)
((SELECT id FROM roles WHERE name = 'dealer_user'), 'dashboard', 'read'),
((SELECT id FROM roles WHERE name = 'dealer_user'), 'sales_orders', 'read'),
((SELECT id FROM roles WHERE name = 'dealer_user'), 'service_orders', 'read'),
((SELECT id FROM roles WHERE name = 'dealer_user'), 'reports', 'read'),

-- Management permissions
((SELECT id FROM roles WHERE name = 'system_admin'), 'management', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_admin'), 'management', 'write'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'management', 'write');