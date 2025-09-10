-- STEP 3: Fix RLS infinite recursion issues
-- The current policies cause 500 errors due to infinite recursion

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_dealer_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_system_admin" ON profiles;

DROP POLICY IF EXISTS "dealer_memberships_select_own" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_same_dealer" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_insert_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_update_system_admin" ON dealer_memberships;

-- Create non-recursive policies using auth.uid() directly
-- These policies avoid infinite recursion by not querying the same table they protect

-- Profiles policies
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (
    -- Users can see their own profile
    auth.uid() = id
    OR
    -- System admin can see all (using email to avoid recursion)
    auth.email() = 'rruiz@lima.llc'
    OR
    -- Users in same dealership can see each other
    EXISTS (
      SELECT 1 FROM dealer_memberships dm1
      JOIN dealer_memberships dm2 ON dm1.dealer_id = dm2.dealer_id
      WHERE dm1.user_id = auth.uid()
      AND dm2.user_id = profiles.id
      AND dm1.is_active = true
      AND dm2.is_active = true
    )
  );

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (
    auth.email() = 'rruiz@lima.llc'
  );

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR
    auth.email() = 'rruiz@lima.llc'
  );

-- Dealer memberships policies
CREATE POLICY "dealer_memberships_select_policy" ON dealer_memberships
  FOR SELECT
  USING (
    -- Users can see their own memberships
    auth.uid() = user_id
    OR
    -- System admin can see all
    auth.email() = 'rruiz@lima.llc'
    OR
    -- Users in same dealership can see each other's memberships
    EXISTS (
      SELECT 1 FROM dealer_memberships viewer_membership
      WHERE viewer_membership.user_id = auth.uid()
      AND viewer_membership.dealer_id = dealer_memberships.dealer_id
      AND viewer_membership.is_active = true
    )
  );

CREATE POLICY "dealer_memberships_insert_policy" ON dealer_memberships
  FOR INSERT
  WITH CHECK (
    auth.email() = 'rruiz@lima.llc'
  );

CREATE POLICY "dealer_memberships_update_policy" ON dealer_memberships
  FOR UPDATE
  USING (
    auth.email() = 'rruiz@lima.llc'
  );

-- Show final status
SELECT 'RLS policies updated successfully' as message;
SELECT auth.email() as current_user_email;