-- Create function to verify invitation token publicly (bypasses RLS)
CREATE OR REPLACE FUNCTION verify_invitation_token(
  p_invitation_token TEXT
)
RETURNS TABLE (
  id UUID,
  dealer_id BIGINT,
  email TEXT,
  role_name TEXT,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  inviter_id UUID,
  dealership_name TEXT,
  inviter_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows bypassing RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT
    di.id,
    di.dealer_id,
    di.email,
    di.role_name,
    di.expires_at,
    di.accepted_at,
    di.inviter_id,
    d.name as dealership_name,
    p.email as inviter_email
  FROM dealer_invitations di
  LEFT JOIN dealerships d ON d.id = di.dealer_id
  LEFT JOIN profiles p ON p.id = di.inviter_id
  WHERE di.invitation_token = p_invitation_token;
END;
$$;