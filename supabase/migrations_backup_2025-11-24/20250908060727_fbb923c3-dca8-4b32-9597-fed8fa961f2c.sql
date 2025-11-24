-- Create dealer invitation system (completing from previous migration)
CREATE TABLE IF NOT EXISTS dealer_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id),
  dealer_id BIGINT NOT NULL REFERENCES dealerships(id),
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

-- Function to get dealership statistics
CREATE OR REPLACE FUNCTION get_dealership_stats(p_dealer_id BIGINT)
RETURNS TABLE(
  total_users INTEGER,
  active_users INTEGER,
  pending_invitations INTEGER,
  total_orders INTEGER,
  orders_this_month INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Users count
    (SELECT COUNT(*)::INTEGER 
     FROM dealer_memberships dm 
     WHERE dm.dealer_id = p_dealer_id) as total_users,
    
    (SELECT COUNT(*)::INTEGER 
     FROM dealer_memberships dm 
     WHERE dm.dealer_id = p_dealer_id AND dm.is_active = true) as active_users,
    
    -- Pending invitations
    (SELECT COUNT(*)::INTEGER 
     FROM dealer_invitations di 
     WHERE di.dealer_id = p_dealer_id 
     AND di.accepted_at IS NULL 
     AND di.expires_at > now()) as pending_invitations,
    
    -- Orders count
    (SELECT COUNT(*)::INTEGER 
     FROM orders o 
     WHERE o.dealer_id = p_dealer_id) as total_orders,
    
    (SELECT COUNT(*)::INTEGER 
     FROM orders o 
     WHERE o.dealer_id = p_dealer_id 
     AND o.created_at >= date_trunc('month', CURRENT_DATE)) as orders_this_month;
END;
$$;