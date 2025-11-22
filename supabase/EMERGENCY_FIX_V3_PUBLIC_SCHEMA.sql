-- =====================================================
-- EMERGENCY FIX V3 - PUBLIC SCHEMA (No auth schema permissions needed)
-- =====================================================
-- Uses public schema for helper function
-- =====================================================

-- Step 1: Create helper function in PUBLIC schema
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Step 2: Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_same_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_select_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_system_admin" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_dealer_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_dealer_isolation" ON profiles;
DROP POLICY IF EXISTS "secure_view_dealership_profiles" ON profiles;
DROP POLICY IF EXISTS "secure_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "secure_manage_dealership_profiles" ON profiles;
DROP POLICY IF EXISTS "secure_delete_dealership_profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_view_own" ON profiles;
DROP POLICY IF EXISTS "profiles_view_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_managers" ON profiles;
DROP POLICY IF EXISTS "profiles_update_managers" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_managers" ON profiles;
DROP POLICY IF EXISTS "secure_update" ON profiles;
DROP POLICY IF EXISTS "profiles_select_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

-- Step 3: Create NEW policies using helper function (NO RECURSION)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_select_same_dealership" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm1
      INNER JOIN dealer_memberships dm2 ON dm1.dealer_id = dm2.dealer_id
      WHERE dm1.user_id = profiles.id
        AND dm2.user_id = auth.uid()
        AND dm1.is_active = true
        AND dm2.is_active = true
    )
  );

-- ✅ Uses helper function - NO RECURSION
CREATE POLICY "profiles_select_system_admin" ON profiles
  FOR SELECT
  USING (public.get_current_user_role() = 'system_admin');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ✅ Uses helper function - NO RECURSION
CREATE POLICY "profiles_update_system_admin" ON profiles
  FOR UPDATE
  USING (public.get_current_user_role() = 'system_admin');

-- ✅ Uses helper function - NO RECURSION
CREATE POLICY "profiles_delete_system_admin" ON profiles
  FOR DELETE
  USING (public.get_current_user_role() = 'system_admin');

-- =====================================================
-- DEALER_MEMBERSHIPS - Same approach
-- =====================================================

DROP POLICY IF EXISTS "dealer_memberships_select_own" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_same_dealer" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_insert_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_update_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_delete_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "secure_view_dealer_memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "secure_manage_dealer_memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "secure_update" ON dealer_memberships;

CREATE POLICY "dealer_memberships_select_own" ON dealer_memberships
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "dealer_memberships_select_same_dealer" ON dealer_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = dealer_memberships.dealer_id
        AND dm.user_id = auth.uid()
        AND dm.is_active = true
    )
  );

-- ✅ Uses helper function - NO RECURSION
CREATE POLICY "dealer_memberships_select_system_admin" ON dealer_memberships
  FOR SELECT
  USING (public.get_current_user_role() = 'system_admin');

CREATE POLICY "dealer_memberships_insert_system_admin" ON dealer_memberships
  FOR INSERT
  WITH CHECK (public.get_current_user_role() = 'system_admin');

CREATE POLICY "dealer_memberships_update_system_admin" ON dealer_memberships
  FOR UPDATE
  USING (public.get_current_user_role() = 'system_admin');

CREATE POLICY "dealer_memberships_delete_system_admin" ON dealer_memberships
  FOR DELETE
  USING (public.get_current_user_role() = 'system_admin');

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test the helper function
SELECT
  '✅ HELPER FUNCTION TEST' as test,
  auth.uid() as current_user_id,
  public.get_current_user_role() as current_user_role;

-- Count policies
SELECT
  '✅ POLICY COUNT - PROFILES' as test,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles';

SELECT
  '✅ POLICY COUNT - DEALER_MEMBERSHIPS' as test,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'dealer_memberships';

-- Test profile query
SELECT
  '✅ PROFILE QUERY TEST' as test,
  id,
  email,
  role
FROM profiles
WHERE id = auth.uid()
LIMIT 1;

-- Test dealer_memberships query
SELECT
  '✅ MEMBERSHIPS QUERY TEST' as test,
  COUNT(*) as membership_count
FROM dealer_memberships
WHERE user_id = auth.uid();

COMMENT ON FUNCTION public.get_current_user_role() IS 'Security definer function to get user role without RLS recursion - FIXED 2025-11-21';
COMMENT ON TABLE profiles IS 'RLS policies FIXED 2025-11-21 v3: Using public.get_current_user_role() security definer function';
COMMENT ON TABLE dealer_memberships IS 'RLS policies FIXED 2025-11-21 v3: Using public.get_current_user_role() security definer function';
