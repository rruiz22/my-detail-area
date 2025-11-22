-- =====================================================
-- NUCLEAR OPTION - Complete Clean Slate
-- =====================================================
-- Drops EVERY policy on both tables and recreates from scratch
-- =====================================================

-- =====================================================
-- STEP 1: DISABLE RLS temporarily (for cleanup)
-- =====================================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_memberships DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: DROP EVERY SINGLE POLICY (no IF EXISTS needed now)
-- =====================================================

-- Get all policy names and drop them
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all profiles policies
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY %I ON profiles', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;

    -- Drop all dealer_memberships policies
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'dealer_memberships'
    LOOP
        EXECUTE format('DROP POLICY %I ON dealer_memberships', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: RE-ENABLE RLS
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_memberships ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE CLEAN POLICIES (6 profiles + 5 memberships = 11 total)
-- =====================================================

-- PROFILES (6 policies)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

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

CREATE POLICY "profiles_select_system_admin" ON profiles
  FOR SELECT
  USING (public.get_current_user_role() = 'system_admin');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_system_admin" ON profiles
  FOR UPDATE
  USING (public.get_current_user_role() = 'system_admin');

CREATE POLICY "profiles_delete_system_admin" ON profiles
  FOR DELETE
  USING (public.get_current_user_role() = 'system_admin');

-- DEALER_MEMBERSHIPS (5 policies - NO same_dealer to avoid recursion)
CREATE POLICY "dealer_memberships_select_own" ON dealer_memberships
  FOR SELECT
  USING (user_id = auth.uid());

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
-- STEP 5: VERIFICATION
-- =====================================================

SELECT '✅ VERIFICATION' as test, 'Checking policy counts...' as status;

SELECT
  '📊 Policy Counts' as report,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') as profiles_count,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dealer_memberships') as memberships_count,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') = 6
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dealer_memberships') = 5
    THEN '✅ CORRECT (6 + 5 = 11 total)'
    ELSE '❌ WRONG COUNT'
  END as result;

-- Test queries
SELECT '✅ TEST: Current user' as test, auth.uid() as user_id, public.get_current_user_role() as role;

SELECT '✅ TEST: Profile access' as test, COUNT(*) as count FROM profiles WHERE id = auth.uid();

SELECT '✅ TEST: Memberships access' as test, COUNT(*) as count FROM dealer_memberships WHERE user_id = auth.uid();

-- List all policies created
SELECT
  '📋 Final Policy List' as report,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'dealer_memberships')
ORDER BY tablename, cmd, policyname;

COMMENT ON TABLE profiles IS 'RLS NUCLEAR CLEAN 2025-11-21: All policies dropped and recreated (6 policies)';
COMMENT ON TABLE dealer_memberships IS 'RLS NUCLEAR CLEAN 2025-11-21: All policies dropped and recreated (5 policies)';

SELECT '🎉 NUCLEAR CLEAN COMPLETE' as final_status;
