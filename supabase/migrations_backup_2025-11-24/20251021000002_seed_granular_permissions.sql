-- =====================================================
-- Seed Granular Permissions Data
-- =====================================================
-- Description: Populate system and module permissions with predefined values
-- Author: Claude Code
-- Date: 2025-10-21
-- Migration: 2/4 - Data seeding
-- =====================================================

-- =====================================================
-- PART 1: System-Level Permissions
-- =====================================================
-- Global permissions that apply across the entire system

INSERT INTO system_permissions (permission_key, display_name, description, category) VALUES
('manage_all_settings', 'Can manage all kinds of settings', 'Full access to system configuration and settings', 'administration'),
('invite_users', 'Can add/invite new team members', 'Send invitations to new users to join the dealership', 'administration'),
('activate_deactivate_users', 'Can activate/deactivate team members', 'Enable or disable user accounts', 'administration'),
('delete_users', 'Can delete team members', 'Permanently remove users from the system', 'administration'),
('manage_dealerships', 'Can manage multiple dealerships', 'Create, edit, and configure dealerships', 'administration'),
('view_audit_logs', 'Can view system audit logs', 'Access to security and change logs for compliance', 'security'),
('manage_roles', 'Can manage roles and permissions', 'Create and edit custom roles and their permissions', 'administration'),
('view_all_reports', 'Can view all dealership reports', 'Access to all reporting and analytics', 'reporting')
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- PART 2: Dashboard Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('dashboard', 'view_dashboard', 'View dashboard', 'Can see dashboard overview and KPIs'),
('dashboard', 'customize_widgets', 'Customize dashboard widgets', 'Can personalize dashboard layout'),
('dashboard', 'view_all_dealerships', 'View all dealerships data', 'See data from multiple dealerships'),
('dashboard', 'export_dashboard_data', 'Export dashboard data', 'Download dashboard metrics')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 3: Sales Orders Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('sales_orders', 'view_orders', 'View sales orders', 'Can see sales orders list and details'),
('sales_orders', 'create_orders', 'Create sales orders', 'Can create new sales orders'),
('sales_orders', 'edit_orders', 'Edit sales orders', 'Can modify existing sales orders'),
('sales_orders', 'delete_orders', 'Delete sales orders', 'Can delete sales orders'),
('sales_orders', 'change_status', 'Change order status', 'Can update order workflow status'),
('sales_orders', 'view_pricing', 'View pricing information', 'Can see prices and costs'),
('sales_orders', 'edit_pricing', 'Edit pricing information', 'Can modify prices'),
('sales_orders', 'access_internal_notes', 'Access internal notes', 'Can view/edit private notes'),
('sales_orders', 'export_data', 'Export sales data', 'Can export orders to CSV/Excel'),
('sales_orders', 'assign_orders', 'Assign orders to users', 'Can reassign order ownership'),
('sales_orders', 'view_customer_info', 'View customer information', 'Can see customer contact details'),
('sales_orders', 'edit_customer_info', 'Edit customer information', 'Can modify customer data')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 4: Service Orders Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('service_orders', 'view_orders', 'View service orders', 'Can see service orders'),
('service_orders', 'create_orders', 'Create service orders', 'Can create new service orders'),
('service_orders', 'edit_orders', 'Edit service orders', 'Can modify service orders'),
('service_orders', 'delete_orders', 'Delete service orders', 'Can delete service orders'),
('service_orders', 'change_status', 'Change order status', 'Can update service status'),
('service_orders', 'view_pricing', 'View pricing', 'Can see service costs'),
('service_orders', 'edit_pricing', 'Edit pricing', 'Can modify service pricing'),
('service_orders', 'access_internal_notes', 'Access internal notes', 'Can view private notes'),
('service_orders', 'export_data', 'Export service data', 'Can export service orders'),
('service_orders', 'assign_orders', 'Assign service orders', 'Can reassign technicians')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 5: Recon Orders Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('recon_orders', 'view_orders', 'View recon orders', 'Can see reconditioning orders'),
('recon_orders', 'create_orders', 'Create recon orders', 'Can create new recon orders'),
('recon_orders', 'edit_orders', 'Edit recon orders', 'Can modify recon orders'),
('recon_orders', 'delete_orders', 'Delete recon orders', 'Can delete recon orders'),
('recon_orders', 'change_status', 'Change order status', 'Can update recon workflow status'),
('recon_orders', 'view_pricing', 'View pricing', 'Can see recon costs'),
('recon_orders', 'edit_pricing', 'Edit pricing', 'Can modify recon pricing'),
('recon_orders', 'access_internal_notes', 'Access internal notes', 'Can view private notes'),
('recon_orders', 'export_data', 'Export recon data', 'Can export recon orders'),
('recon_orders', 'assign_orders', 'Assign recon orders', 'Can reassign recon work')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 6: Car Wash Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('car_wash', 'view_orders', 'View car wash orders', 'Can see car wash orders'),
('car_wash', 'create_orders', 'Create car wash orders', 'Can create new car wash orders'),
('car_wash', 'edit_orders', 'Edit car wash orders', 'Can modify car wash orders'),
('car_wash', 'delete_orders', 'Delete car wash orders', 'Can delete car wash orders'),
('car_wash', 'change_status', 'Change order status', 'Can update car wash status'),
('car_wash', 'export_data', 'Export car wash data', 'Can export car wash orders')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 7: Stock/Inventory Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('stock', 'view_inventory', 'View inventory', 'Can see vehicle stock'),
('stock', 'add_vehicles', 'Add vehicles', 'Can add new vehicles to inventory'),
('stock', 'edit_vehicles', 'Edit vehicles', 'Can modify vehicle information'),
('stock', 'delete_vehicles', 'Delete vehicles', 'Can remove vehicles from inventory'),
('stock', 'view_pricing', 'View vehicle pricing', 'Can see vehicle costs'),
('stock', 'edit_pricing', 'Edit vehicle pricing', 'Can modify vehicle prices'),
('stock', 'export_data', 'Export inventory data', 'Can export vehicle list'),
('stock', 'manage_stock_numbers', 'Manage stock numbers', 'Can assign/edit stock numbers')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 8: Contacts Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('contacts', 'view_contacts', 'View contacts', 'Can see contact list'),
('contacts', 'create_contacts', 'Create contacts', 'Can add new contacts'),
('contacts', 'edit_contacts', 'Edit contacts', 'Can modify contact information'),
('contacts', 'delete_contacts', 'Delete contacts', 'Can remove contacts'),
('contacts', 'export_data', 'Export contacts', 'Can export contact list'),
('contacts', 'generate_qr_codes', 'Generate QR codes', 'Can create contact QR codes')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 9: Reports Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('reports', 'view_reports', 'View reports', 'Can see all reports'),
('reports', 'create_custom_reports', 'Create custom reports', 'Can build custom reports'),
('reports', 'export_reports', 'Export reports', 'Can download reports as PDF/Excel'),
('reports', 'schedule_reports', 'Schedule reports', 'Can set up automated report delivery'),
('reports', 'view_financial_reports', 'View financial reports', 'Can see revenue and financial data')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 10: Users Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('users', 'view_users', 'View users', 'Can see user list'),
('users', 'create_users', 'Create users', 'Can add new users'),
('users', 'edit_users', 'Edit users', 'Can modify user information'),
('users', 'delete_users', 'Delete users', 'Can remove users'),
('users', 'assign_roles', 'Assign roles', 'Can assign/modify user roles'),
('users', 'reset_passwords', 'Reset passwords', 'Can reset user passwords'),
('users', 'view_user_activity', 'View user activity', 'Can see user login history')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 11: Management Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('management', 'view_settings', 'View settings', 'Can see management settings'),
('management', 'edit_settings', 'Edit settings', 'Can modify system settings'),
('management', 'manage_modules', 'Manage modules', 'Can enable/disable dealership modules'),
('management', 'manage_themes', 'Manage themes', 'Can customize appearance'),
('management', 'view_system_logs', 'View system logs', 'Can see system activity logs'),
('management', 'manage_integrations', 'Manage integrations', 'Can configure third-party integrations')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 12: Productivity Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('productivity', 'view_tasks', 'View tasks', 'Can see tasks'),
('productivity', 'create_tasks', 'Create tasks', 'Can create new tasks'),
('productivity', 'edit_tasks', 'Edit tasks', 'Can modify tasks'),
('productivity', 'delete_tasks', 'Delete tasks', 'Can remove tasks'),
('productivity', 'assign_tasks', 'Assign tasks', 'Can assign tasks to users'),
('productivity', 'view_calendar', 'View calendar', 'Can see calendar'),
('productivity', 'manage_calendar', 'Manage calendar', 'Can create/edit calendar events')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 13: Chat Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('chat', 'view_conversations', 'View conversations', 'Can see chat messages'),
('chat', 'send_messages', 'Send messages', 'Can send chat messages'),
('chat', 'create_groups', 'Create groups', 'Can create group chats'),
('chat', 'delete_messages', 'Delete messages', 'Can delete own messages'),
('chat', 'delete_others_messages', 'Delete others messages', 'Can delete any message'),
('chat', 'manage_participants', 'Manage participants', 'Can add/remove chat members'),
('chat', 'send_files', 'Send files', 'Can send file attachments')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 14: Settings Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('settings', 'view_settings', 'View settings', 'Can see system settings'),
('settings', 'edit_general_settings', 'Edit general settings', 'Can modify general preferences'),
('settings', 'edit_notification_settings', 'Edit notification settings', 'Can configure notifications'),
('settings', 'edit_security_settings', 'Edit security settings', 'Can modify security options'),
('settings', 'manage_api_keys', 'Manage API keys', 'Can create/revoke API keys')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- PART 15: Dealerships Module Permissions
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description) VALUES
('dealerships', 'view_dealerships', 'View dealerships', 'Can see dealership list'),
('dealerships', 'create_dealerships', 'Create dealerships', 'Can add new dealerships'),
('dealerships', 'edit_dealerships', 'Edit dealerships', 'Can modify dealership settings'),
('dealerships', 'delete_dealerships', 'Delete dealerships', 'Can remove dealerships'),
('dealerships', 'manage_dealership_modules', 'Manage dealership modules', 'Can enable/disable modules per dealership'),
('dealerships', 'switch_dealerships', 'Switch between dealerships', 'Can change active dealership context')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
DECLARE
  v_system_perms_count INT;
  v_module_perms_count INT;
BEGIN
  SELECT COUNT(*) INTO v_system_perms_count FROM system_permissions;
  SELECT COUNT(*) INTO v_module_perms_count FROM module_permissions;

  RAISE NOTICE '✅ Granular permissions seeded successfully';
  RAISE NOTICE '   - % system-level permissions created', v_system_perms_count;
  RAISE NOTICE '   - % module-specific permissions created', v_module_perms_count;
  RAISE NOTICE '   - Covered modules: dashboard, sales_orders, service_orders, recon_orders,';
  RAISE NOTICE '     car_wash, stock, contacts, reports, users, management, productivity,';
  RAISE NOTICE '     chat, settings, dealerships';
END $$;
