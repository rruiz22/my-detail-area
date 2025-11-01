-- =====================================================
-- Fix Custom Roles Architecture
-- =====================================================
-- Description: Implements proper custom roles system for dealerships
-- Author: Claude Code
-- Date: 2025-10-06
-- Issue: Custom roles not properly assigned to users
-- Fix:
--   1. Add custom_role_id to dealer_memberships
--   2. Fix accept_dealer_invitation to use custom roles properly
--   3. Create user_custom_role_assignments entries
--   4. Migrate existing data
-- =====================================================

-- =====================================================
-- PART 1: Schema Changes
-- =====================================================

-- Add custom_role_id column to dealer_memberships
ALTER TABLE dealer_memberships
ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES dealer_custom_roles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_dealer_memberships_custom_role_id
ON dealer_memberships(custom_role_id);

-- Add comment for documentation
COMMENT ON COLUMN dealer_memberships.custom_role_id IS
'Foreign key to dealer_custom_roles table. Replaces the TEXT role column with proper UUID reference.';

-- =====================================================
-- PART 2: Data Migration
-- =====================================================

-- Migrate existing dealer_memberships.role (TEXT) to custom_role_id (UUID)
-- Maps role names to their corresponding custom role IDs
UPDATE dealer_memberships dm
SET custom_role_id = dcr.id
FROM dealer_custom_roles dcr
WHERE dm.role = dcr.role_name
  AND dm.dealer_id = dcr.dealer_id
  AND dm.custom_role_id IS NULL;

-- Create user_custom_role_assignments for existing memberships
INSERT INTO user_custom_role_assignments (
  user_id,
  dealer_id,
  custom_role_id,
  is_active,
  assigned_at,
  created_at,
  updated_at
)
SELECT DISTINCT
  dm.user_id,
  dm.dealer_id,
  dm.custom_role_id,
  dm.is_active,
  dm.joined_at,
  NOW(),
  NOW()
FROM dealer_memberships dm
WHERE dm.custom_role_id IS NOT NULL
  AND NOT EXISTS (
    -- Avoid duplicates
    SELECT 1 FROM user_custom_role_assignments ucra
    WHERE ucra.user_id = dm.user_id
      AND ucra.dealer_id = dm.dealer_id
      AND ucra.custom_role_id = dm.custom_role_id
  );

-- Log migration results
DO $$
DECLARE
  v_migrated_count INT;
  v_assignments_count INT;
BEGIN
  SELECT COUNT(*) INTO v_migrated_count
  FROM dealer_memberships
  WHERE custom_role_id IS NOT NULL;

  SELECT COUNT(*) INTO v_assignments_count
  FROM user_custom_role_assignments;

  RAISE NOTICE 'Migration completed: % memberships updated, % role assignments created',
    v_migrated_count, v_assignments_count;
END $$;

-- =====================================================
-- PART 3: Updated accept_dealer_invitation Function
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS accept_dealer_invitation(TEXT);

-- Recreate function with custom roles support
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
  v_custom_role_id UUID;
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

  -- 🔥 NEW: Validate custom role exists and get its ID
  SELECT id INTO v_custom_role_id
  FROM dealer_custom_roles
  WHERE dealer_id = v_invitation.dealer_id
    AND role_name = v_invitation.role_name
    AND is_active = true;

  IF v_custom_role_id IS NULL THEN
    RAISE EXCEPTION 'Invalid role: % does not exist for this dealership', v_invitation.role_name;
  END IF;

  RAISE NOTICE 'Found custom role: % (ID: %)', v_invitation.role_name, v_custom_role_id;

  -- Check if membership already exists
  SELECT EXISTS (
    SELECT 1
    FROM dealer_memberships
    WHERE user_id = v_user_id
    AND dealer_id = v_invitation.dealer_id
  ) INTO v_membership_exists;

  -- Create or update dealer membership
  IF v_membership_exists THEN
    -- Update existing membership with custom role
    UPDATE dealer_memberships
    SET
      custom_role_id = v_custom_role_id,
      role = v_invitation.role_name,  -- Keep for backward compatibility
      is_active = true,
      updated_at = NOW()
    WHERE user_id = v_user_id
    AND dealer_id = v_invitation.dealer_id;

    RAISE NOTICE 'Updated existing membership for user % in dealership %', v_user_id, v_invitation.dealer_id;
  ELSE
    -- Create new membership with custom role
    INSERT INTO dealer_memberships (
      user_id,
      dealer_id,
      custom_role_id,
      role,  -- Keep for backward compatibility
      is_active,
      joined_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_invitation.dealer_id,
      v_custom_role_id,
      v_invitation.role_name,  -- Keep for backward compatibility
      true,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created new membership for user % in dealership %', v_user_id, v_invitation.dealer_id;
  END IF;

  -- 🔥 NEW: Create or update user_custom_role_assignments
  INSERT INTO user_custom_role_assignments (
    user_id,
    dealer_id,
    custom_role_id,
    is_active,
    assigned_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_invitation.dealer_id,
    v_custom_role_id,
    true,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, dealer_id, custom_role_id)
  DO UPDATE SET
    is_active = true,
    updated_at = NOW();

  RAISE NOTICE 'Created/updated custom role assignment for user %', v_user_id;

  -- Update profiles table with dealership_id if not set
  UPDATE profiles
  SET
    dealership_id = v_invitation.dealer_id,
    updated_at = NOW()
  WHERE id = v_user_id
  AND dealership_id IS NULL;

  -- 🔥 NEW: Update profiles.role based on custom role
  -- Note: profiles.role has CHECK constraint, only allows: admin, manager, technician, viewer, system_admin
  UPDATE profiles
  SET
    role = CASE
      WHEN v_invitation.role_name LIKE '%admin%' THEN 'admin'
      WHEN v_invitation.role_name LIKE '%manager%' THEN 'manager'
      WHEN v_invitation.role_name LIKE '%technician%' OR v_invitation.role_name LIKE '%advisor%' THEN 'technician'
      ELSE 'viewer'
    END,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Mark invitation as accepted
  UPDATE dealer_invitations
  SET
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_invitation.id;

  -- Log successful acceptance
  RAISE NOTICE 'Invitation accepted: User=%, Dealer=%, Role=%, CustomRoleID=%',
    v_user_id, v_invitation.dealer_id, v_invitation.role_name, v_custom_role_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_dealer_invitation(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION accept_dealer_invitation(TEXT) IS
'Accepts a dealer invitation using a token. Validates token, expiration, email match, and custom role existence. Creates dealer membership, user custom role assignment, and updates profiles. Returns error if custom role does not exist.';

-- =====================================================
-- PART 4: Constraints and Unique Indexes
-- =====================================================

-- Add unique constraint to prevent duplicate role assignments
-- Note: This may already exist, so we use IF NOT EXISTS pattern
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_custom_role_assignments_unique'
  ) THEN
    ALTER TABLE user_custom_role_assignments
    ADD CONSTRAINT user_custom_role_assignments_unique
    UNIQUE (user_id, dealer_id, custom_role_id);
  END IF;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Custom roles architecture migration completed successfully';
  RAISE NOTICE '   - Added custom_role_id column to dealer_memberships';
  RAISE NOTICE '   - Migrated existing role assignments';
  RAISE NOTICE '   - Updated accept_dealer_invitation function';
  RAISE NOTICE '   - Added constraints and indexes';
END $$;
