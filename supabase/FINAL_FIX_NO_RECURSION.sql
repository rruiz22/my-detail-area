-- =====================================================
-- FINAL FIX - Eliminate ALL recursion possibilities
-- =====================================================
-- Simplifies policies to avoid ANY self-referencing
-- =====================================================

-- Drop ALL existing policies on both tables
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_same_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_select_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_system_admin" ON profiles;

DROP POLICY IF EXISTS "dealer_memberships_select_own" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_same_dealer" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_insert_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_update_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_delete_system_admin" ON dealer_memberships;

-- =====================================================
-- PROFILES - Simple policies WITHOUT recursion
-- =====================================================

-- 1. View own profile (simple, no recursion)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- 2. View profiles in same dealership (FIXED - no self-reference to dealer_memberships)
CREATE POLICY "profiles_select_same_dealership" ON profiles
  FOR SELECT
  USING (
    profiles.id IN (
      SELECT DISTINCT dm1.user_id
      FROM dealer_memberships dm1
      WHERE dm1.dealer_id IN (
        SELECT DISTINCT dm2.dealer_id
        FROM dealer_memberships dm2
        WHERE dm2.user_id = auth.uid()
          AND dm2.is_active = true
      )
      AND dm1.is_active = true
    )
  );

-- 3. System admin (using helper function)
CREATE POLICY "profiles_select_system_admin" ON profiles
  FOR SELECT
  USING (public.get_current_user_role() = 'system_admin');

-- 4. Update own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. System admin update
CREATE POLICY "profiles_update_system_admin" ON profiles
  FOR UPDATE
  USING (public.get_current_user_role() = 'system_admin');

-- 6. System admin delete
CREATE POLICY "profiles_delete_system_admin" ON profiles
  FOR DELETE
  USING (public.get_current_user_role() = 'system_admin');

-- =====================================================
-- DEALER_MEMBERSHIPS - Simple policies WITHOUT self-reference
-- =====================================================

-- 1. View own memberships (simple, no recursion)
CREATE POLICY "dealer_memberships_select_own" ON dealer_memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- 2. System admin view all (using helper function)
CREATE POLICY "dealer_memberships_select_system_admin" ON dealer_memberships
  FOR SELECT
  USING (public.get_current_user_role() = 'system_admin');

-- 3. System admin insert
CREATE POLICY "dealer_memberships_insert_system_admin" ON dealer_memberships
  FOR INSERT
  WITH CHECK (public.get_current_user_role() = 'system_admin');

-- 4. System admin update
CREATE POLICY "dealer_memberships_update_system_admin" ON dealer_memberships
  FOR UPDATE
  USING (public.get_current_user_role() = 'system_admin');

-- 5. System admin delete
CREATE POLICY "dealer_memberships_delete_system_admin" ON dealer_memberships
  FOR DELETE
  USING (public.get_current_user_role() = 'system_admin');

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test queries
SELECT '✅ TEST 1: Current user' as test, auth.uid() as user_id, public.get_current_user_role() as role;

SELECT '✅ TEST 2: Profile query' as test, COUNT(*) as profile_count FROM profiles WHERE id = auth.uid();

SELECT '✅ TEST 3: Memberships query' as test, COUNT(*) as membership_count FROM dealer_memberships WHERE user_id = auth.uid();

SELECT '✅ TEST 4: Policy count profiles' as test, COUNT(*) as count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';

SELECT '✅ TEST 5: Policy count memberships' as test, COUNT(*) as count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dealer_memberships';

COMMENT ON TABLE profiles IS 'RLS policies FINAL FIX 2025-11-21: Eliminated ALL recursion with simplified policies';
COMMENT ON TABLE dealer_memberships IS 'RLS policies FINAL FIX 2025-11-21: Eliminated ALL recursion with simplified policies';
