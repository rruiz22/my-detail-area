-- =====================================================
-- Manual Fix: rudyruizlima@gmail.com Membership
-- =====================================================
-- Description: Manually create membership for user who signed up but couldn't accept invitation
-- Author: Claude Code
-- Date: 2025-10-06
-- Issue: User created account with invitation but email confirmation blocked auto-acceptance
-- User ID: 2a42f92a-a3a8-45ff-a962-36a25c396767
-- Dealership: BMW of Sudbury (ID: 5)
-- Custom Role: sales_manager (ID: e77c5940-f527-4b43-bd0b-8c83fdc1a694)
-- =====================================================

DO $$
DECLARE
  v_user_id UUID := '2a42f92a-a3a8-45ff-a962-36a25c396767';
  v_dealer_id BIGINT := 5;
  v_custom_role_id UUID := 'e77c5940-f527-4b43-bd0b-8c83fdc1a694';
  v_invitation_id UUID := 'b90b1791-5bda-43ee-96f5-577357ded07e';
  v_membership_exists BOOLEAN;
  v_assignment_exists BOOLEAN;
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User % does not exist', v_user_id;
  END IF;

  -- Verify custom role exists
  IF NOT EXISTS (SELECT 1 FROM dealer_custom_roles WHERE id = v_custom_role_id) THEN
    RAISE EXCEPTION 'Custom role % does not exist', v_custom_role_id;
  END IF;

  RAISE NOTICE '🔧 Starting manual membership fix for user rudyruizlima@gmail.com';

  -- Check if membership exists
  SELECT EXISTS (
    SELECT 1 FROM dealer_memberships
    WHERE user_id = v_user_id AND dealer_id = v_dealer_id
  ) INTO v_membership_exists;

  -- Create or update dealer_memberships
  IF v_membership_exists THEN
    RAISE NOTICE '   ⚠️  Membership already exists, updating...';

    UPDATE dealer_memberships
    SET
      custom_role_id = v_custom_role_id,
      role = 'sales_manager',
      is_active = true,
      updated_at = NOW()
    WHERE user_id = v_user_id
      AND dealer_id = v_dealer_id;

    RAISE NOTICE '   ✅ Membership updated';
  ELSE
    RAISE NOTICE '   📝 Creating new membership...';

    INSERT INTO dealer_memberships (
      user_id,
      dealer_id,
      custom_role_id,
      role,
      is_active,
      joined_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_dealer_id,
      v_custom_role_id,
      'sales_manager',
      true,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE '   ✅ Membership created';
  END IF;

  -- Check if role assignment exists
  SELECT EXISTS (
    SELECT 1 FROM user_custom_role_assignments
    WHERE user_id = v_user_id
      AND dealer_id = v_dealer_id
      AND custom_role_id = v_custom_role_id
  ) INTO v_assignment_exists;

  -- Create or update user_custom_role_assignments
  IF v_assignment_exists THEN
    RAISE NOTICE '   ⚠️  Role assignment already exists, updating...';

    UPDATE user_custom_role_assignments
    SET
      is_active = true,
      updated_at = NOW()
    WHERE user_id = v_user_id
      AND dealer_id = v_dealer_id
      AND custom_role_id = v_custom_role_id;

    RAISE NOTICE '   ✅ Role assignment updated';
  ELSE
    RAISE NOTICE '   📝 Creating new role assignment...';

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
      v_dealer_id,
      v_custom_role_id,
      true,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE '   ✅ Role assignment created';
  END IF;

  -- Update profiles.role from 'viewer' to appropriate role
  -- Note: profiles.role has CHECK constraint, only allows: admin, manager, technician, viewer, system_admin
  UPDATE profiles
  SET
    role = 'manager',  -- sales_manager maps to manager
    updated_at = NOW()
  WHERE id = v_user_id
    AND role = 'viewer';  -- Only update if still 'viewer'

  RAISE NOTICE '   ✅ Profile role updated from viewer to manager';

  -- Mark invitation as accepted
  UPDATE dealer_invitations
  SET
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_invitation_id
    AND accepted_at IS NULL;

  RAISE NOTICE '   ✅ Invitation marked as accepted';

  -- Summary
  RAISE NOTICE '✅ Manual fix completed for rudyruizlima@gmail.com:';
  RAISE NOTICE '   - Dealer: BMW of Sudbury (ID: %)' ,v_dealer_id;
  RAISE NOTICE '   - Custom Role: sales_manager (ID: %)', v_custom_role_id;
  RAISE NOTICE '   - Profile role updated: viewer → manager';
  RAISE NOTICE '   - User should now appear in DealerUsers tab';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error during manual fix: %', SQLERRM;
    RAISE;
END $$;
