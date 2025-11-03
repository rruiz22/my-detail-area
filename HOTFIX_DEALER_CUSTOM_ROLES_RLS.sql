-- =====================================================
-- HOTFIX 2: Fix dealer_custom_roles RLS Policies
-- =====================================================
-- Issue: ManageCustomRolesModal spinner infinito
-- Causa: dealer_custom_roles tiene RLS policies recursivas
-- =====================================================

-- STEP 1: Disable RLS temporarily
ALTER TABLE dealer_custom_roles DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop all existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'dealer_custom_roles')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON dealer_custom_roles';
    END LOOP;
END $$;

-- STEP 3: Create SIMPLE, NON-RECURSIVE policies

-- Policy 1: System admins and supermanagers see all roles
CREATE POLICY "System users see all custom roles"
ON dealer_custom_roles FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

-- Policy 2: Users see custom roles from their dealership
CREATE POLICY "Users see dealer custom roles"
ON dealer_custom_roles FOR SELECT
USING (
  -- System admins see all
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
  OR
  -- Users see roles from their dealership (using profiles.dealership_id directly)
  dealer_id IN (
    SELECT dealership_id FROM profiles WHERE id = auth.uid() AND dealership_id IS NOT NULL
  )
);

-- Policy 3: Only system_admin and supermanager can create roles
CREATE POLICY "System users create custom roles"
ON dealer_custom_roles FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

-- Policy 4: Only system_admin and supermanager can update roles
CREATE POLICY "System users update custom roles"
ON dealer_custom_roles FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

-- Policy 5: Only system_admin can delete roles
CREATE POLICY "System admin deletes custom roles"
ON dealer_custom_roles FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'system_admin'
);

-- STEP 4: Re-enable RLS
ALTER TABLE dealer_custom_roles ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT
  'dealer_custom_roles RLS FIXED' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'dealer_custom_roles';
