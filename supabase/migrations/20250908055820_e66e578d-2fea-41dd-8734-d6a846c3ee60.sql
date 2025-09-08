-- Add missing permissions for dealer_manager and dealer_user roles
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
((SELECT id FROM roles WHERE name = 'dealer_user'), 'reports', 'read');

-- Add new granular permission modules
INSERT INTO role_permissions (role_id, module, permission_level) VALUES
-- Sales Orders specific permissions
((SELECT id FROM roles WHERE name = 'dealer_admin'), 'sales_orders', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'sales_orders', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_sales_manager'), 'sales_orders', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_salesperson'), 'sales_orders', 'write'),

-- Service Orders specific permissions  
((SELECT id FROM roles WHERE name = 'dealer_admin'), 'service_orders', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'service_orders', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_service_manager'), 'service_orders', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_service_advisor'), 'service_orders', 'write'),

-- Management permissions
((SELECT id FROM roles WHERE name = 'system_admin'), 'management', 'admin'),
((SELECT id FROM roles WHERE name = 'dealer_admin'), 'management', 'write'),
((SELECT id FROM roles WHERE name = 'dealer_manager'), 'management', 'write');

-- Create dealer invitation system
CREATE TABLE IF NOT EXISTS dealer_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id),
  dealer_id BIGINT NOT NULL,
  email TEXT NOT NULL,
  role_name TEXT NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for dealer_invitations
ALTER TABLE dealer_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for dealer_invitations
CREATE POLICY "Users can view invitations they created or received"
ON dealer_invitations FOR SELECT
USING (
  inviter_id = auth.uid() OR 
  email = auth.email() OR
  is_admin()
);

CREATE POLICY "Dealers can create invitations for their dealership"
ON dealer_invitations FOR INSERT
WITH CHECK (
  is_admin() OR 
  user_has_active_dealer_membership(auth.uid(), dealer_id)
);

CREATE POLICY "Inviter can update their invitations"
ON dealer_invitations FOR UPDATE
USING (inviter_id = auth.uid() OR is_admin());

-- Function to create dealer invitation
CREATE OR REPLACE FUNCTION create_dealer_invitation(
  p_dealer_id BIGINT,
  p_email TEXT,
  p_role_name TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_token TEXT;
BEGIN
  -- Generate unique invitation token
  invitation_token := encode(gen_random_bytes(32), 'hex');
  
  -- Insert invitation
  INSERT INTO dealer_invitations (
    inviter_id, 
    dealer_id, 
    email, 
    role_name, 
    invitation_token
  ) VALUES (
    auth.uid(),
    p_dealer_id,
    p_email,
    p_role_name,
    invitation_token
  );
  
  RETURN invitation_token;
END;
$$;

-- Function to accept dealer invitation
CREATE OR REPLACE FUNCTION accept_dealer_invitation(
  p_invitation_token TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record dealer_invitations%ROWTYPE;
  membership_id UUID;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM dealer_invitations
  WHERE invitation_token = p_invitation_token
  AND expires_at > now()
  AND accepted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- Verify email matches current user
  IF invitation_record.email != auth.email() THEN
    RAISE EXCEPTION 'Invitation email does not match current user';
  END IF;
  
  -- Create dealer membership
  INSERT INTO dealer_memberships (user_id, dealer_id)
  VALUES (auth.uid(), invitation_record.dealer_id)
  RETURNING id INTO membership_id;
  
  -- Assign role to user
  PERFORM assign_role(auth.uid(), invitation_record.role_name);
  
  -- Mark invitation as accepted
  UPDATE dealer_invitations
  SET accepted_at = now(), updated_at = now()
  WHERE id = invitation_record.id;
  
  RETURN TRUE;
END;
$$;

-- Create audit log for permissions changes
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'assign_role', 'remove_role', 'update_membership'
  old_value JSONB,
  new_value JSONB,
  dealer_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for audit log
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit log
CREATE POLICY "Users can view audit logs for their dealership"
ON permission_audit_log FOR SELECT
USING (
  is_admin() OR 
  (dealer_id IS NOT NULL AND user_has_active_dealer_membership(auth.uid(), dealer_id))
);

-- Function to log permission changes
CREATE OR REPLACE FUNCTION log_permission_change(
  p_target_user_id UUID,
  p_action TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_dealer_id BIGINT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO permission_audit_log (
    user_id,
    target_user_id,
    action,
    old_value,
    new_value,
    dealer_id
  ) VALUES (
    auth.uid(),
    p_target_user_id,
    p_action,
    p_old_value,
    p_new_value,
    p_dealer_id
  );
END;
$$;

-- Update the assign_role function to include audit logging
CREATE OR REPLACE FUNCTION assign_role(
  target_user_id UUID, 
  role_name TEXT, 
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_uuid UUID;
  old_roles JSONB;
  new_roles JSONB;
BEGIN
  -- Get current roles for audit
  SELECT jsonb_agg(r.name) INTO old_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = target_user_id AND ura.is_active = true;
  
  -- Get role ID
  SELECT id INTO role_uuid FROM roles WHERE name = role_name AND is_active = true;
  
  IF role_uuid IS NULL THEN
    RAISE EXCEPTION 'Role % not found', role_name;
  END IF;
  
  -- Insert or update role assignment
  INSERT INTO user_role_assignments (user_id, role_id, assigned_by, expires_at)
  VALUES (target_user_id, role_uuid, auth.uid(), expires_at)
  ON CONFLICT (user_id, role_id) 
  DO UPDATE SET 
    is_active = true,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();
  
  -- Get new roles for audit
  SELECT jsonb_agg(r.name) INTO new_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = target_user_id AND ura.is_active = true;
  
  -- Log the change
  PERFORM log_permission_change(
    target_user_id,
    'assign_role',
    jsonb_build_object('roles', old_roles),
    jsonb_build_object('roles', new_roles, 'new_role', role_name)
  );
    
  RETURN true;
END;
$$;