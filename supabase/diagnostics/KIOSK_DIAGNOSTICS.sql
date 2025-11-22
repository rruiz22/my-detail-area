-- =====================================================
-- DIAGNOSTIC QUERIES FOR KIOSK 400 ERROR
-- =====================================================
-- Purpose: Investigate 400 Bad Request when creating kiosks
-- Date: 2025-11-22
-- =====================================================

-- Query 1: Check dealerships.id data type
-- Expected: Should be INTEGER or BIGINT
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dealerships'
  AND column_name = 'id';

-- Query 2: Check user memberships and roles
-- Expected: Should show dealership_id and user role
SELECT
  dm.dealership_id,
  dm.role,
  d.name as dealership_name,
  p.email,
  pg_typeof(dm.dealership_id) as dealership_id_type
FROM dealer_memberships dm
JOIN profiles p ON p.id = dm.user_id
JOIN dealerships d ON d.id = dm.dealership_id
WHERE p.email = 'rruiz@lima.llc'
ORDER BY dm.dealership_id;

-- Query 3: Check detail_hub_kiosks schema
-- Expected: Should show all columns with their types
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'detail_hub_kiosks'
ORDER BY ordinal_position;

-- Query 4: Check RLS policies on detail_hub_kiosks
-- Expected: Should show INSERT policy for managers/admins
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'detail_hub_kiosks'
ORDER BY cmd, policyname;

-- Query 5: Check if custom ENUM types exist
-- Expected: Should show detail_hub_kiosk_status and detail_hub_camera_status
SELECT
  typname,
  enumlabel,
  enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('detail_hub_kiosk_status', 'detail_hub_camera_status')
ORDER BY typname, enumsortorder;

-- Query 6: Test manual INSERT as authenticated user
-- Expected: Should fail with the EXACT same error as application
-- NOTE: Replace 'YOUR_USER_ID' with actual auth.uid() before running
DO $$
DECLARE
  v_user_id UUID := (SELECT id FROM profiles WHERE email = 'rruiz@lima.llc');
  v_dealership_id INTEGER := 1;
BEGIN
  -- Set session context to simulate authenticated user
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id)::text, true);

  -- Attempt to insert kiosk
  INSERT INTO detail_hub_kiosks (
    dealership_id,
    kiosk_code,
    name,
    status,
    camera_status
  ) VALUES (
    v_dealership_id,
    'TEST-DEBUG-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'Debug Test Kiosk',
    'offline',
    'inactive'
  );

  RAISE NOTICE 'INSERT succeeded - kiosk created';

  -- Clean up test data
  DELETE FROM detail_hub_kiosks
  WHERE kiosk_code LIKE 'TEST-DEBUG-%';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'INSERT failed with error: %', SQLERRM;
    RAISE NOTICE 'Error detail: %', SQLSTATE;
END $$;

-- Query 7: Check constraints on detail_hub_kiosks
-- Expected: Should show all CHECK constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.detail_hub_kiosks'::regclass
ORDER BY contype, conname;

-- Query 8: Verify dealership_id=1 exists
-- Expected: Should return at least one row
SELECT
  id,
  name,
  code,
  created_at
FROM dealerships
WHERE id = 1;

-- Query 9: Check if there are ANY kiosks in the system
-- Expected: May be empty if no kiosks created yet
SELECT
  id,
  dealership_id,
  kiosk_code,
  name,
  status,
  camera_status,
  created_at
FROM detail_hub_kiosks
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- DIAGNOSTIC SUMMARY QUERY
-- =====================================================
-- This combines multiple checks into one view
SELECT
  'Table Exists' AS check_type,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'detail_hub_kiosks')
    THEN 'PASS'
    ELSE 'FAIL'
  END AS status
UNION ALL
SELECT
  'RLS Enabled' AS check_type,
  CASE
    WHEN relrowsecurity = true THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM pg_class
WHERE relname = 'detail_hub_kiosks'
UNION ALL
SELECT
  'INSERT Policy Exists' AS check_type,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM pg_policies
WHERE tablename = 'detail_hub_kiosks'
  AND cmd = 'INSERT'
UNION ALL
SELECT
  'ENUM Types Exist' AS check_type,
  CASE
    WHEN COUNT(*) = 2 THEN 'PASS'
    ELSE 'FAIL (' || COUNT(*)::TEXT || ' found)'
  END AS status
FROM pg_type
WHERE typname IN ('detail_hub_kiosk_status', 'detail_hub_camera_status')
UNION ALL
SELECT
  'User Has Membership' AS check_type,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM dealer_memberships dm
JOIN profiles p ON p.id = dm.user_id
WHERE p.email = 'rruiz@lima.llc';
