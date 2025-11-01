-- =====================================================
-- Dealer Invitations System - RPC Functions
-- =====================================================
-- Description: Create RPC functions for dealer invitation workflow
-- Author: Claude Code
-- Date: 2025-10-02
-- =====================================================

-- =====================================================
-- Function: create_dealer_invitation
-- =====================================================
-- Description: Creates a new dealer invitation with token generation
-- Parameters:
--   p_dealer_id: Dealership ID
--   p_email: Invitee email address
--   p_role_name: Role to assign (dealer_user, dealer_admin, etc.)
-- Returns: JSON object with invitation details
-- =====================================================

CREATE OR REPLACE FUNCTION create_dealer_invitation(
  p_dealer_id INTEGER,
  p_email TEXT,
  p_role_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id UUID;
  v_token TEXT;
  v_inviter_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_result JSON;
BEGIN
  -- Get current user ID
  v_inviter_id := auth.uid();

  -- Validate inviter is authenticated
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to send invitations';
  END IF;

  -- Validate dealer exists
  IF NOT EXISTS (SELECT 1 FROM dealerships WHERE id = p_dealer_id) THEN
    RAISE EXCEPTION 'Dealership not found with ID: %', p_dealer_id;
  END IF;

  -- Validate role name (must be one of the valid dealer roles)
  IF p_role_name NOT IN (
    'dealer_user',
    'dealer_salesperson',
    'dealer_service_advisor',
    'dealer_sales_manager',
    'dealer_service_manager',
    'dealer_manager',
    'dealer_admin'
  ) THEN
    RAISE EXCEPTION 'Invalid role name: %. Must be a valid dealer role.', p_role_name;
  END IF;

  -- Generate unique invitation token (32 character random string)
  v_token := encode(gen_random_bytes(24), 'hex');

  -- Set expiration date (7 days from now)
  v_expires_at := NOW() + INTERVAL '7 days';

  -- Generate new UUID for invitation
  v_invitation_id := gen_random_uuid();

  -- Insert invitation record
  INSERT INTO dealer_invitations (
    id,
    dealer_id,
    email,
    role_name,
    inviter_id,
    invitation_token,
    expires_at,
    created_at,
    updated_at
  ) VALUES (
    v_invitation_id,
    p_dealer_id,
    LOWER(p_email),
    p_role_name,
    v_inviter_id,
    v_token,
    v_expires_at,
    NOW(),
    NOW()
  );

  -- Build result JSON
  v_result := json_build_object(
    'id', v_invitation_id,
    'token', v_token,
    'email', LOWER(p_email),
    'role_name', p_role_name,
    'dealer_id', p_dealer_id,
    'inviter_id', v_inviter_id,
    'expires_at', v_expires_at,
    'created_at', NOW()
  );

  -- Log successful invitation creation
  RAISE NOTICE 'Invitation created: ID=%, Email=%, Role=%', v_invitation_id, p_email, p_role_name;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_dealer_invitation(INTEGER, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION create_dealer_invitation(INTEGER, TEXT, TEXT) IS
'Creates a new dealer invitation with a secure token. Validates dealer existence and role validity. Returns invitation details as JSON.';


-- =====================================================
-- Function: accept_dealer_invitation
-- =====================================================
-- Description: Accepts a dealer invitation and creates dealer membership
-- Parameters:
--   token_input: Invitation token from email link
-- Returns: VOID
-- Side Effects: Creates dealer_memberships record, updates invitation
-- =====================================================

CREATE OR REPLACE FUNCTION accept_dealer_invitation(
  token_input TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_membership_exists BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to accept invitations';
  END IF;

  -- Find invitation by token
  SELECT
    id,
    dealer_id,
    email,
    role_name,
    expires_at,
    accepted_at
  INTO v_invitation
  FROM dealer_invitations
  WHERE invitation_token = token_input;

  -- Validate invitation exists
  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation token';
  END IF;

  -- Validate invitation not already accepted
  IF v_invitation.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation has already been accepted';
  END IF;

  -- Validate invitation not expired
  IF v_invitation.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  -- Validate email matches current user
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = v_user_id
    AND LOWER(email) = LOWER(v_invitation.email)
  ) THEN
    RAISE EXCEPTION 'Email address does not match invitation';
  END IF;

  -- Check if membership already exists
  SELECT EXISTS (
    SELECT 1
    FROM dealer_memberships
    WHERE user_id = v_user_id
    AND dealer_id = v_invitation.dealer_id
  ) INTO v_membership_exists;

  -- Create or update dealer membership
  IF v_membership_exists THEN
    -- Update existing membership with new role
    UPDATE dealer_memberships
    SET
      role = v_invitation.role_name,
      updated_at = NOW()
    WHERE user_id = v_user_id
    AND dealer_id = v_invitation.dealer_id;

    RAISE NOTICE 'Updated existing membership for user % in dealership %', v_user_id, v_invitation.dealer_id;
  ELSE
    -- Create new membership
    INSERT INTO dealer_memberships (
      user_id,
      dealer_id,
      role,
      joined_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_invitation.dealer_id,
      v_invitation.role_name,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created new membership for user % in dealership %', v_user_id, v_invitation.dealer_id;
  END IF;

  -- Update profiles table with dealership_id if not set
  UPDATE profiles
  SET
    dealership_id = v_invitation.dealer_id,
    updated_at = NOW()
  WHERE id = v_user_id
  AND dealership_id IS NULL;

  -- Mark invitation as accepted
  UPDATE dealer_invitations
  SET
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_invitation.id;

  -- Log successful acceptance
  RAISE NOTICE 'Invitation accepted: User=%, Dealer=%, Role=%', v_user_id, v_invitation.dealer_id, v_invitation.role_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_dealer_invitation(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION accept_dealer_invitation(TEXT) IS
'Accepts a dealer invitation using a token. Validates token, expiration, and email match. Creates or updates dealer membership.';


-- =====================================================
-- Function: verify_invitation_token
-- =====================================================
-- Description: Verifies an invitation token and returns invitation details
-- Parameters:
--   token_input: Invitation token to verify
-- Returns: JSON object with validation result and invitation details
-- =====================================================

CREATE OR REPLACE FUNCTION verify_invitation_token(
  token_input TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_dealership_name TEXT;
  v_inviter_email TEXT;
  v_is_valid BOOLEAN;
  v_error_message TEXT;
  v_result JSON;
BEGIN
  -- Find invitation by token with related data
  SELECT
    di.id,
    di.dealer_id,
    di.email,
    di.role_name,
    di.expires_at,
    di.accepted_at,
    di.inviter_id,
    di.created_at,
    d.name AS dealership_name,
    p.email AS inviter_email
  INTO v_invitation
  FROM dealer_invitations di
  LEFT JOIN dealerships d ON d.id = di.dealer_id
  LEFT JOIN profiles p ON p.id = di.inviter_id
  WHERE di.invitation_token = token_input;

  -- Validate invitation exists
  IF v_invitation IS NULL THEN
    v_result := json_build_object(
      'valid', FALSE,
      'error', 'not_found',
      'message', 'Invitation not found or token is invalid'
    );
    RETURN v_result;
  END IF;

  -- Check if already accepted
  IF v_invitation.accepted_at IS NOT NULL THEN
    v_result := json_build_object(
      'valid', FALSE,
      'error', 'already_accepted',
      'message', 'This invitation has already been accepted',
      'invitation', json_build_object(
        'id', v_invitation.id,
        'accepted_at', v_invitation.accepted_at
      )
    );
    RETURN v_result;
  END IF;

  -- Check if expired
  IF v_invitation.expires_at < NOW() THEN
    v_result := json_build_object(
      'valid', FALSE,
      'error', 'expired',
      'message', 'This invitation has expired',
      'invitation', json_build_object(
        'id', v_invitation.id,
        'expires_at', v_invitation.expires_at
      )
    );
    RETURN v_result;
  END IF;

  -- Build valid result with full invitation details
  v_result := json_build_object(
    'valid', TRUE,
    'invitation', json_build_object(
      'id', v_invitation.id,
      'email', v_invitation.email,
      'role_name', v_invitation.role_name,
      'expires_at', v_invitation.expires_at,
      'created_at', v_invitation.created_at,
      'dealership', json_build_object(
        'id', v_invitation.dealer_id,
        'name', v_invitation.dealership_name
      ),
      'inviter', json_build_object(
        'id', v_invitation.inviter_id,
        'email', v_invitation.inviter_email
      )
    )
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to anonymous users (public invitation links)
GRANT EXECUTE ON FUNCTION verify_invitation_token(TEXT) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION verify_invitation_token(TEXT) IS
'Verifies an invitation token without requiring authentication. Returns invitation details if valid, or error information if invalid/expired/accepted.';
