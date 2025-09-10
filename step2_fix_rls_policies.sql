-- STEP 2: Fix RLS policies and set admin user
-- Execute this AFTER step1_add_enum_value.sql

-- First, drop existing conflicting policies
DROP POLICY IF EXISTS "profiles_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "dealer_memberships_select_policy" ON dealer_memberships;

-- Create comprehensive RLS policies for profiles table
-- Policy 1: Users can always see their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: System admins can see all profiles
DROP POLICY IF EXISTS "profiles_select_system_admin" ON profiles;
CREATE POLICY "profiles_select_system_admin" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (
        p.user_type = 'system_admin'::user_type
        OR p.email = 'rruiz@lima.llc'
      )
    )
  );

-- Policy 3: Dealer admins can see profiles in their dealership
DROP POLICY IF EXISTS "profiles_select_dealer_admin" ON profiles;
CREATE POLICY "profiles_select_dealer_admin" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      JOIN profiles admin_profile ON admin_profile.id = auth.uid()
      WHERE dm.user_id = profiles.id
      AND admin_profile.user_type = 'dealer'::user_type
      AND EXISTS (
        SELECT 1 FROM dealer_memberships admin_dm
        WHERE admin_dm.user_id = auth.uid()
        AND admin_dm.dealer_id = dm.dealer_id
        AND admin_dm.is_active = true
      )
    )
  );

-- Update policies for INSERT (only admins can create profiles via admin functions)
DROP POLICY IF EXISTS "profiles_insert_system_admin" ON profiles;
CREATE POLICY "profiles_insert_system_admin" ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (
        p.user_type = 'system_admin'::user_type
        OR p.email = 'rruiz@lima.llc'
      )
    )
  );

-- Update policies for UPDATE (users can update own profile, admins can update any)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_system_admin" ON profiles;
CREATE POLICY "profiles_update_system_admin" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (
        p.user_type = 'system_admin'::user_type
        OR p.email = 'rruiz@lima.llc'
      )
    )
  );

-- Fix dealer_memberships policies
DROP POLICY IF EXISTS "dealer_memberships_select_own" ON dealer_memberships;
CREATE POLICY "dealer_memberships_select_own" ON dealer_memberships
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dealer_memberships_select_system_admin" ON dealer_memberships;
CREATE POLICY "dealer_memberships_select_system_admin" ON dealer_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (
        p.user_type = 'system_admin'::user_type
        OR p.email = 'rruiz@lima.llc'
      )
    )
  );

DROP POLICY IF EXISTS "dealer_memberships_select_same_dealer" ON dealer_memberships;
CREATE POLICY "dealer_memberships_select_same_dealer" ON dealer_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships viewer_membership
      WHERE viewer_membership.user_id = auth.uid()
      AND viewer_membership.dealer_id = dealer_memberships.dealer_id
      AND viewer_membership.is_active = true
    )
  );

-- Insert/Update policies for dealer_memberships
DROP POLICY IF EXISTS "dealer_memberships_insert_system_admin" ON dealer_memberships;
CREATE POLICY "dealer_memberships_insert_system_admin" ON dealer_memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (
        p.user_type = 'system_admin'::user_type
        OR p.email = 'rruiz@lima.llc'
      )
    )
  );

DROP POLICY IF EXISTS "dealer_memberships_update_system_admin" ON dealer_memberships;
CREATE POLICY "dealer_memberships_update_system_admin" ON dealer_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND (
        p.user_type = 'system_admin'::user_type
        OR p.email = 'rruiz@lima.llc'
      )
    )
  );

-- Set rruiz@lima.llc as system_admin
UPDATE profiles 
SET user_type = 'system_admin'::user_type
WHERE email = 'rruiz@lima.llc';

-- Ensure RLS is enabled on both tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_memberships ENABLE ROW LEVEL SECURITY;

-- Show final status
SELECT 'Final user type for rruiz@lima.llc:' as info;
SELECT user_type, email FROM profiles WHERE email = 'rruiz@lima.llc';

SELECT 'All profiles should now be visible to system admin:' as info;
SELECT COUNT(*) as total_profiles FROM profiles;