-- =====================================================
-- HOTFIX: Fix Infinite Recursion in dealer_memberships RLS
-- =====================================================
-- Issue: RLS policies causing infinite recursion
-- User affected: supermanager (paulk@dealerdetailservice.com)
-- Error: "infinite recursion detected in policy for relation dealer_memberships"
-- =====================================================

-- STEP 1: Temporarily disable RLS to allow access
ALTER TABLE dealer_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_role_assignments DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop problematic policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "System admins and supermanagers have full access" ON dealer_memberships;
DROP POLICY IF EXISTS "Users with manage_users permission can manage memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "select_dealer_memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "insert_dealer_memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "update_dealer_memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "delete_dealer_memberships" ON dealer_memberships;

-- STEP 3: Create SIMPLE, NON-RECURSIVE policies

-- Policy 1: Users can view their own memberships
CREATE POLICY "Users can view own memberships"
ON dealer_memberships
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  -- System admin bypass (direct role check, NO subquery)
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'system_admin'
  OR
  -- Supermanager bypass (direct role check, NO subquery)
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'supermanager'
);

-- Policy 2: Insert - Only system_admin and supermanager
CREATE POLICY "System users can insert memberships"
ON dealer_memberships
FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

-- Policy 3: Update - Only system_admin and supermanager
CREATE POLICY "System users can update memberships"
ON dealer_memberships
FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

-- Policy 4: Delete - Only system_admin
CREATE POLICY "System admin can delete memberships"
ON dealer_memberships
FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'system_admin'
);

-- STEP 4: Re-enable RLS
ALTER TABLE dealer_memberships ENABLE ROW LEVEL SECURITY;

-- STEP 5: Fix user_custom_role_assignments policies similarly
DROP POLICY IF EXISTS "Users can view their custom roles" ON user_custom_role_assignments;
DROP POLICY IF EXISTS "System admins can manage custom roles" ON user_custom_role_assignments;

CREATE POLICY "Users view own custom roles"
ON user_custom_role_assignments
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

CREATE POLICY "System users manage custom roles"
ON user_custom_role_assignments
FOR ALL
USING (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

ALTER TABLE user_custom_role_assignments ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT
  'RLS Policies Updated' as status,
  NOW() as timestamp;
