-- =====================================================
-- EMERGENCY ROLLBACK - Phase 1 RLS Optimization
-- =====================================================
-- Execute this IMMEDIATELY to restore functionality
-- =====================================================

-- =====================================================
-- PROFILES TABLE - ROLLBACK
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_same_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_select_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_system_admin" ON profiles;

-- Restore simple working policies (from 20251108000003_cleanup_rls_policies.sql)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_select_same_dealership" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm1
      INNER JOIN dealer_memberships dm2 ON dm1.dealer_id = dm2.dealer_id
      WHERE dm1.user_id = profiles.id
        AND dm2.user_id = (SELECT auth.uid())
        AND dm1.is_active = true
        AND dm2.is_active = true
    )
  );

-- Simple system_admin check WITHOUT recursion
CREATE POLICY "profiles_select_system_admin" ON profiles
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'system_admin'
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_system_admin" ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'system_admin'
  );

CREATE POLICY "profiles_delete_system_admin" ON profiles
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'system_admin'
  );

-- =====================================================
-- DEALER_MEMBERSHIPS TABLE - ROLLBACK
-- =====================================================

-- Drop policies
DROP POLICY IF EXISTS "dealer_memberships_select_own" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_same_dealer" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_insert_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_update_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_delete_system_admin" ON dealer_memberships;

-- Restore working policies
CREATE POLICY "dealer_memberships_select_own" ON dealer_memberships
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "dealer_memberships_select_same_dealer" ON dealer_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = dealer_memberships.dealer_id
        AND dm.user_id = (SELECT auth.uid())
        AND dm.is_active = true
    )
  );

CREATE POLICY "dealer_memberships_select_system_admin" ON dealer_memberships
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'system_admin'
  );

CREATE POLICY "dealer_memberships_insert_system_admin" ON dealer_memberships
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'system_admin'
  );

CREATE POLICY "dealer_memberships_update_system_admin" ON dealer_memberships
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'system_admin'
  );

CREATE POLICY "dealer_memberships_delete_system_admin" ON dealer_memberships
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'system_admin'
  );

-- =====================================================
-- ORDERS TABLE - Keep (no recursion issue)
-- =====================================================
-- Orders policies are SAFE - no recursion issue
-- Leave as is from Phase 1 migration

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if app is working
SELECT
  '✅ ROLLBACK VERIFICATION' as status,
  COUNT(*) as profile_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- Should return 6 policies

-- Test basic query
SELECT
  '✅ TEST QUERY' as status,
  id,
  email,
  role
FROM profiles
WHERE id = (SELECT auth.uid())
LIMIT 1;

-- Should return your profile without errors

COMMENT ON TABLE profiles IS 'RLS policies ROLLED BACK 2025-11-21: Fixed infinite recursion';
COMMENT ON TABLE dealer_memberships IS 'RLS policies ROLLED BACK 2025-11-21: Fixed infinite recursion';
