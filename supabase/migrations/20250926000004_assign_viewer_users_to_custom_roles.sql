-- Migration: Assign existing viewer users to custom roles
-- Purpose: Map legacy viewer users to new custom role assignments
-- Author: Claude Code
-- Date: 2025-09-26
-- Risk Level: LOW (only adds assignments, doesn't modify profiles)

-- Assign ar@lima.llc to dealer_viewer_full
-- This user currently has role_permissions: dashboard(read), sales_orders(write), reports(read)
DO $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'ar@lima.llc';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User ar@lima.llc not found, skipping assignment';
    RETURN;
  END IF;

  -- Get role ID
  SELECT id INTO v_role_id
  FROM dealer_custom_roles
  WHERE dealer_id = 5 AND role_name = 'dealer_viewer_full';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role dealer_viewer_full not found for dealer 5';
  END IF;

  -- Create assignment
  INSERT INTO user_custom_role_assignments (
    user_id,
    dealer_id,
    custom_role_id,
    assigned_by,
    is_active
  )
  VALUES (
    v_user_id,
    5,
    v_role_id,
    v_user_id, -- Self-assigned for migration
    true
  )
  ON CONFLICT (user_id, dealer_id, custom_role_id) DO UPDATE
    SET is_active = true,
        updated_at = now();

  RAISE NOTICE 'Assigned ar@lima.llc to dealer_viewer_full role';
END $$;

-- Assign ruizpires86@gmail.com to dealer_viewer_basic
DO $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'ruizpires86@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User ruizpires86@gmail.com not found, skipping assignment';
    RETURN;
  END IF;

  SELECT id INTO v_role_id
  FROM dealer_custom_roles
  WHERE dealer_id = 5 AND role_name = 'dealer_viewer_basic';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role dealer_viewer_basic not found for dealer 5';
  END IF;

  INSERT INTO user_custom_role_assignments (
    user_id,
    dealer_id,
    custom_role_id,
    assigned_by,
    is_active
  )
  VALUES (
    v_user_id,
    5,
    v_role_id,
    v_user_id,
    true
  )
  ON CONFLICT (user_id, dealer_id, custom_role_id) DO UPDATE
    SET is_active = true,
        updated_at = now();

  RAISE NOTICE 'Assigned ruizpires86@gmail.com to dealer_viewer_basic role';
END $$;

-- Assign rudyruiz22@hotmail.com to dealer_viewer_basic
DO $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'rudyruiz22@hotmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User rudyruiz22@hotmail.com not found, skipping assignment';
    RETURN;
  END IF;

  SELECT id INTO v_role_id
  FROM dealer_custom_roles
  WHERE dealer_id = 5 AND role_name = 'dealer_viewer_basic';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role dealer_viewer_basic not found for dealer 5';
  END IF;

  INSERT INTO user_custom_role_assignments (
    user_id,
    dealer_id,
    custom_role_id,
    assigned_by,
    is_active
  )
  VALUES (
    v_user_id,
    5,
    v_role_id,
    v_user_id,
    true
  )
  ON CONFLICT (user_id, dealer_id, custom_role_id) DO UPDATE
    SET is_active = true,
        updated_at = now();

  RAISE NOTICE 'Assigned rudyruiz22@hotmail.com to dealer_viewer_basic role';
END $$;

-- Verification query (commented out for production, uncomment for testing)
-- SELECT
--   p.email,
--   p.role as legacy_role,
--   dcr.display_name as custom_role,
--   ucra.is_active
-- FROM user_custom_role_assignments ucra
-- JOIN profiles p ON ucra.user_id = p.id
-- JOIN dealer_custom_roles dcr ON ucra.custom_role_id = dcr.id
-- WHERE ucra.dealer_id = 5 AND ucra.is_active = true;