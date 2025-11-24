-- =====================================================
-- Add RLS Policies to Granular Permissions System
-- =====================================================
-- Description: Row Level Security policies for permission tables
-- Author: Claude Code
-- Date: 2025-10-21
-- Migration: 3/4 - Security policies
-- =====================================================

-- =====================================================
-- PART 1: Enable RLS on All Permission Tables
-- =====================================================

ALTER TABLE system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_permissions_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: System Permissions RLS Policies
-- =====================================================

-- Everyone can read system permissions (needed for UI)
CREATE POLICY system_permissions_read_all ON system_permissions
  FOR SELECT
  USING (true);

-- Only system admins can modify system permissions
CREATE POLICY system_permissions_admin_all ON system_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- PART 3: Module Permissions RLS Policies
-- =====================================================

-- Everyone can read module permissions (needed for UI)
CREATE POLICY module_permissions_read_all ON module_permissions
  FOR SELECT
  USING (true);

-- Only system admins can modify module permissions
CREATE POLICY module_permissions_admin_all ON module_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- PART 4: Role System Permissions RLS Policies
-- =====================================================

-- System admins can see all role-permission assignments
CREATE POLICY role_system_permissions_admin_all ON role_system_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Users can see their own role's system permissions
CREATE POLICY role_system_permissions_user_read ON role_system_permissions
  FOR SELECT
  USING (
    role_id IN (
      SELECT custom_role_id
      FROM user_custom_role_assignments
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Dealer admins can manage their dealership's roles
CREATE POLICY role_system_permissions_dealer_admin ON role_system_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dealer_custom_roles dcr
      JOIN profiles p ON p.dealership_id = dcr.dealer_id
      WHERE dcr.id = role_system_permissions.role_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- PART 5: Role Module Permissions RLS Policies
-- =====================================================

-- System admins can see all role-permission assignments
CREATE POLICY role_module_permissions_admin_all ON role_module_permissions_new
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Users can see their own role's module permissions
CREATE POLICY role_module_permissions_user_read ON role_module_permissions_new
  FOR SELECT
  USING (
    role_id IN (
      SELECT custom_role_id
      FROM user_custom_role_assignments
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Dealer admins can manage their dealership's roles
CREATE POLICY role_module_permissions_dealer_admin ON role_module_permissions_new
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dealer_custom_roles dcr
      JOIN profiles p ON p.dealership_id = dcr.dealer_id
      WHERE dcr.id = role_module_permissions_new.role_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- PART 6: Permission Audit Log RLS Policies
-- =====================================================

-- System admins can see all audit logs
CREATE POLICY permission_audit_admin_read ON permission_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Dealer admins can see audit logs for their dealership's roles
CREATE POLICY permission_audit_dealer_read ON permission_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_custom_roles dcr
      JOIN profiles p ON p.dealership_id = dcr.dealer_id
      WHERE dcr.id = permission_audit_log.role_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    )
  );

-- Only the system can insert audit logs (via triggers)
CREATE POLICY permission_audit_insert_service_role ON permission_audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- PART 7: Audit Trigger Functions
-- =====================================================

-- Function to log system permission changes
CREATE OR REPLACE FUNCTION log_system_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO permission_audit_log (role_id, permission_type, permission_key, action, changed_by, metadata)
    SELECT
      NEW.role_id,
      'system',
      sp.permission_key,
      'granted',
      NEW.granted_by,
      jsonb_build_object('permission_id', NEW.permission_id)
    FROM system_permissions sp
    WHERE sp.id = NEW.permission_id;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO permission_audit_log (role_id, permission_type, permission_key, action, changed_by, metadata)
    SELECT
      OLD.role_id,
      'system',
      sp.permission_key,
      'revoked',
      auth.uid(),
      jsonb_build_object('permission_id', OLD.permission_id)
    FROM system_permissions sp
    WHERE sp.id = OLD.permission_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to log module permission changes
CREATE OR REPLACE FUNCTION log_module_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO permission_audit_log (role_id, permission_type, permission_key, action, changed_by, metadata)
    SELECT
      NEW.role_id,
      'module',
      mp.module || '.' || mp.permission_key,
      'granted',
      NEW.granted_by,
      jsonb_build_object('permission_id', NEW.permission_id, 'module', mp.module)
    FROM module_permissions mp
    WHERE mp.id = NEW.permission_id;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO permission_audit_log (role_id, permission_type, permission_key, action, changed_by, metadata)
    SELECT
      OLD.role_id,
      'module',
      mp.module || '.' || mp.permission_key,
      'revoked',
      auth.uid(),
      jsonb_build_object('permission_id', OLD.permission_id, 'module', mp.module)
    FROM module_permissions mp
    WHERE mp.id = OLD.permission_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =====================================================
-- PART 8: Create Audit Triggers
-- =====================================================

-- Trigger for system permissions
DROP TRIGGER IF EXISTS trg_audit_system_permissions ON role_system_permissions;
CREATE TRIGGER trg_audit_system_permissions
  AFTER INSERT OR DELETE ON role_system_permissions
  FOR EACH ROW
  EXECUTE FUNCTION log_system_permission_change();

-- Trigger for module permissions
DROP TRIGGER IF EXISTS trg_audit_module_permissions ON role_module_permissions_new;
CREATE TRIGGER trg_audit_module_permissions
  AFTER INSERT OR DELETE ON role_module_permissions_new
  FOR EACH ROW
  EXECUTE FUNCTION log_module_permission_change();

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies and audit triggers created successfully';
  RAISE NOTICE '   - Enabled RLS on 5 permission tables';
  RAISE NOTICE '   - Created policies for system admins, dealer admins, and users';
  RAISE NOTICE '   - Created audit logging triggers for compliance';
  RAISE NOTICE '   - Permission changes will be tracked in permission_audit_log';
END $$;
