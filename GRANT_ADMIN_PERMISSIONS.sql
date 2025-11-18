-- =====================================================
-- DIAGNOSE AND GRANT ADMIN PERMISSIONS
-- =====================================================

-- Step 1: Check current user and their memberships
SELECT
  u.id as user_id,
  u.email,
  p.id as profile_id,
  p.email as profile_email,
  dm.id as membership_id,
  dm.role as current_role,
  dm.dealer_id,
  d.name as dealership_name
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN dealer_memberships dm ON dm.user_id = u.id
LEFT JOIN dealerships d ON d.id = dm.dealer_id
WHERE u.id = auth.uid();

-- Step 2: Check if rruiz@lima.llc exists and has system_admin
SELECT
  p.id,
  p.email,
  dm.role,
  d.name as dealership
FROM profiles p
LEFT JOIN dealer_memberships dm ON dm.user_id = p.id
LEFT JOIN dealerships d ON d.id = dm.dealer_id
WHERE p.email = 'rruiz@lima.llc';

-- =====================================================
-- SOLUTION: Grant system_admin to rruiz@lima.llc
-- =====================================================

-- Get user ID for rruiz@lima.llc
DO $$
DECLARE
  v_user_id UUID;
  v_dealer_id INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'rruiz@lima.llc'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User rruiz@lima.llc not found in profiles';
  END IF;

  -- Get first dealership (or create if none exist)
  SELECT id INTO v_dealer_id
  FROM dealerships
  LIMIT 1;

  IF v_dealer_id IS NULL THEN
    RAISE EXCEPTION 'No dealerships found. Please create a dealership first.';
  END IF;

  -- Update or insert dealer_membership with system_admin role
  INSERT INTO dealer_memberships (
    user_id,
    dealer_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_dealer_id,
    'system_admin',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, dealer_id)
  DO UPDATE SET
    role = 'system_admin',
    updated_at = NOW();

  RAISE NOTICE '✅ Granted system_admin role to rruiz@lima.llc for dealership %', v_dealer_id;
  RAISE NOTICE '✅ User should now be able to update employees';
END $$;

-- =====================================================
-- VERIFY: Check permissions again
-- =====================================================
SELECT
  p.email,
  dm.role,
  d.name as dealership,
  CASE
    WHEN dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin') THEN '✅ Has permission'
    ELSE '❌ No permission'
  END as permission_status
FROM profiles p
JOIN dealer_memberships dm ON dm.user_id = p.id
JOIN dealerships d ON d.id = dm.dealer_id
WHERE p.email = 'rruiz@lima.llc';
