-- STEP 5: Clean ALL conflicting RLS policies and create fresh ones

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_dealer_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_system_admin" ON profiles;

-- Drop ALL existing policies on dealer_memberships
DROP POLICY IF EXISTS "dealer_memberships_insert_policy" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_policy" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_update_policy" ON dealer_memberships;
DROP POLICY IF EXISTS "secure_manage_dealer_memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "secure_view_dealer_memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_own" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_same_dealer" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_insert_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_update_system_admin" ON dealer_memberships;

-- Create simple, clean policies for profiles
CREATE POLICY "profiles_access" ON profiles
  FOR ALL
  USING (
    -- System admin can do everything
    auth.email() = 'rruiz@lima.llc'
    OR
    -- Users can access their own profile
    auth.uid() = id
  );

-- Create simple, clean policies for dealer_memberships  
CREATE POLICY "dealer_memberships_access" ON dealer_memberships
  FOR ALL
  USING (
    -- System admin can do everything
    auth.email() = 'rruiz@lima.llc'
    OR
    -- Users can access their own memberships
    auth.uid() = user_id
  );

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_memberships ENABLE ROW LEVEL SECURITY;

-- Test the setup
SELECT 'Policies cleaned and recreated' as message;
SELECT auth.email() as current_user_email;
SELECT COUNT(*) as profiles_visible FROM profiles;