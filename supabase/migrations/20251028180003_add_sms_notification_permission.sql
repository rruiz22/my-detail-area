-- Add receive_sms_notifications permission to module_permissions
-- Migration: 20251028180003_add_sms_notification_permission.sql

-- Insert SMS notification permission for each order module
INSERT INTO module_permissions (module, permission_key, display_name, description, is_active)
VALUES
  ('sales_orders', 'receive_sms_notifications', 'Receive SMS Notifications', 'Receive SMS notifications for sales order updates', true),
  ('service_orders', 'receive_sms_notifications', 'Receive SMS Notifications', 'Receive SMS notifications for service order updates', true),
  ('recon_orders', 'receive_sms_notifications', 'Receive SMS Notifications', 'Receive SMS notifications for recon order updates', true),
  ('car_wash', 'receive_sms_notifications', 'Receive SMS Notifications', 'Receive SMS notifications for car wash order updates', true)
ON CONFLICT (module, permission_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Add helpful comment
COMMENT ON TABLE module_permissions IS 'Catalog of available permissions for each module. receive_sms_notifications permission allows users to receive SMS alerts for order events.';
