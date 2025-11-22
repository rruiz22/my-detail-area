-- =====================================================
-- DEBUG USER DATA
-- =====================================================
-- Check if your user and memberships exist
-- =====================================================

-- Check 1: Does your profile exist?
SELECT
  '1️⃣ PROFILE CHECK' as check_name,
  id,
  email,
  role,
  user_type,
  first_name,
  last_name
FROM profiles
WHERE id = '122c8d5b-e5f5-4782-a179-544acbaaceb9';

-- Check 2: Do your memberships exist? (bypass RLS with service role)
-- NOTE: This will only work if you're using service_role key
SELECT
  '2️⃣ MEMBERSHIPS CHECK (bypassing RLS)' as check_name,
  user_id,
  dealer_id,
  is_active,
  role as membership_role
FROM dealer_memberships
WHERE user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9';

-- Check 3: What is current auth.uid()?
SELECT
  '3️⃣ CURRENT AUTH USER' as check_name,
  auth.uid() as current_user_id,
  public.get_current_user_role() as current_role;

-- Check 4: Test if helper function works
SELECT
  '4️⃣ HELPER FUNCTION TEST' as check_name,
  public.get_current_user_role() as role_from_function;

-- Check 5: List all policies on profiles
SELECT
  '5️⃣ PROFILES POLICIES' as check_name,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Check 6: List all policies on dealer_memberships
SELECT
  '6️⃣ DEALER_MEMBERSHIPS POLICIES' as check_name,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'dealer_memberships'
ORDER BY cmd, policyname;

-- Check 7: Test membership query with explicit user_id
SELECT
  '7️⃣ MEMBERSHIP TEST WITH EXPLICIT ID' as check_name,
  COUNT(*) as count,
  array_agg(dealer_id) as dealer_ids
FROM dealer_memberships
WHERE user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9';

-- Check 8: Is RLS enabled on these tables?
SELECT
  '8️⃣ RLS STATUS' as check_name,
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'dealer_memberships')
ORDER BY tablename;
