-- =====================================================
-- Fix accept_dealer_invitation Function
-- =====================================================
-- Description: Updates accept_dealer_invitation to properly use role column
-- Author: Claude Code
-- Date: 2025-10-04
-- Issue: Function was trying to insert into non-existent 'role' column
-- Fix: Now correctly inserts role value from invitation
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS accept_dealer_invitation(TEXT);

-- Recreate function with proper role handling
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
      is_active = true,
      updated_at = NOW()
    WHERE user_id = v_user_id
    AND dealer_id = v_invitation.dealer_id;

    RAISE NOTICE 'Updated existing membership for user % in dealership %', v_user_id, v_invitation.dealer_id;
  ELSE
    -- Create new membership with role
    INSERT INTO dealer_memberships (
      user_id,
      dealer_id,
      role,
      is_active,
      joined_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_invitation.dealer_id,
      v_invitation.role_name,
      true,
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

  -- Mark invitation as accepted (CRITICAL FIX)
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
'Accepts a dealer invitation using a token. Validates token, expiration, and email match. Creates or updates dealer membership with role. Marks invitation as accepted.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated accept_dealer_invitation function with role column support';
END $$;
