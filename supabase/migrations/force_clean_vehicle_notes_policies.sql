-- =====================================================
-- FORCE Clean All Vehicle Notes Policies
-- Created: 2025-10-14
-- Description: Aggressively removes ALL possible policy names
--              and creates fresh ones
-- =====================================================

-- =====================================================
-- STEP 1: Nuclear cleanup - Drop ALL possible policy names
-- =====================================================

-- Drop all possible policy name variations
DROP POLICY IF EXISTS "Users can view vehicle notes in their dealership" ON public.vehicle_notes;
DROP POLICY IF EXISTS "Users can create vehicle notes in their dealership" ON public.vehicle_notes;
DROP POLICY IF EXISTS "Users can update their own vehicle notes" ON public.vehicle_notes;
DROP POLICY IF EXISTS "Users can delete their own vehicle notes" ON public.vehicle_notes;

DROP POLICY IF EXISTS "Users can view notes for their dealership vehicles" ON public.vehicle_notes;
DROP POLICY IF EXISTS "Users can create notes for their dealership vehicles" ON public.vehicle_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.vehicle_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.vehicle_notes;

DROP POLICY IF EXISTS "Users can view notes based on role" ON public.vehicle_notes;
DROP POLICY IF EXISTS "Users can create notes based on role" ON public.vehicle_notes;
DROP POLICY IF EXISTS "Users can update notes based on role" ON public.vehicle_notes;
DROP POLICY IF EXISTS "Users can delete notes based on role" ON public.vehicle_notes;

DROP POLICY IF EXISTS "vehicle_notes_select_policy" ON public.vehicle_notes;
DROP POLICY IF EXISTS "vehicle_notes_insert_policy" ON public.vehicle_notes;
DROP POLICY IF EXISTS "vehicle_notes_update_policy" ON public.vehicle_notes;
DROP POLICY IF EXISTS "vehicle_notes_delete_policy" ON public.vehicle_notes;

-- Confirm all policies are gone
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All policies removed successfully'
    ELSE '⚠️ ' || COUNT(*) || ' policies still exist'
  END as cleanup_status
FROM pg_policies
WHERE tablename = 'vehicle_notes';

-- =====================================================
-- STEP 2: Create NEW policies with clean unique names
-- =====================================================

-- Policy 1: SELECT with role-based access
CREATE POLICY "vn_select_by_role"
  ON public.vehicle_notes
  FOR SELECT
  USING (
    -- System admins can see all notes
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'system_admin'
    )
    OR
    -- Regular users see only notes from their dealership's vehicles
    EXISTS (
      SELECT 1
      FROM public.recon_vehicles rv
      INNER JOIN public.profiles p ON p.dealership_id = rv.dealer_id
      WHERE rv.id = vehicle_notes.vehicle_id
        AND p.id = auth.uid()
    )
  );

-- Policy 2: INSERT with role-based access
CREATE POLICY "vn_insert_by_role"
  ON public.vehicle_notes
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND (
      -- System admins can create notes for any vehicle
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'system_admin'
      )
      OR
      -- Regular users can create notes only for vehicles in their dealership
      EXISTS (
        SELECT 1
        FROM public.recon_vehicles rv
        INNER JOIN public.profiles p ON p.dealership_id = rv.dealer_id
        WHERE rv.id = vehicle_notes.vehicle_id
          AND p.id = auth.uid()
      )
    )
  );

-- Policy 3: UPDATE with role-based access
CREATE POLICY "vn_update_by_role"
  ON public.vehicle_notes
  FOR UPDATE
  USING (
    -- System admins can update any note
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'system_admin'
    )
    OR
    -- Regular users can only update their own notes
    created_by = auth.uid()
  )
  WITH CHECK (
    -- Prevent changing the creator
    created_by = (SELECT created_by FROM public.vehicle_notes WHERE id = vehicle_notes.id)
  );

-- Policy 4: DELETE with role-based access
CREATE POLICY "vn_delete_by_role"
  ON public.vehicle_notes
  FOR DELETE
  USING (
    -- System admins can delete any note
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'system_admin'
    )
    OR
    -- Regular users can only delete their own notes
    created_by = auth.uid()
  );

-- =====================================================
-- STEP 3: Verify everything is correct
-- =====================================================

-- Show all policies
SELECT
  '📋 ACTIVE POLICIES' as status,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'vehicle_notes'
ORDER BY cmd;

-- Show user info
SELECT
  '👤 YOUR INFO' as status,
  p.email,
  p.role,
  p.dealership_id,
  CASE
    WHEN p.role = 'system_admin' THEN '🔓 SYSTEM ADMIN - Full access to all dealerships'
    WHEN p.dealership_id IS NOT NULL THEN '🔒 USER - Access to dealership ' || p.dealership_id
    ELSE '⚠️ NO ACCESS - No dealership assigned'
  END as access_level
FROM public.profiles p
WHERE p.id = auth.uid();

-- Count accessible notes
SELECT
  '📊 ACCESSIBLE NOTES' as status,
  COUNT(*) as note_count
FROM public.vehicle_notes;

-- Count accessible vehicles
SELECT
  '🚗 ACCESSIBLE VEHICLES' as status,
  COUNT(*) as vehicle_count
FROM public.recon_vehicles
WHERE
  -- System admins see all
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Regular users see only their dealership
  dealer_id = (SELECT dealership_id FROM public.profiles WHERE id = auth.uid());

-- =====================================================
-- Success message
-- =====================================================

DO $$
DECLARE
  user_role TEXT;
  policy_count INTEGER;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'vehicle_notes';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 SUCCESS! Vehicle Notes RLS Configured!';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Old policies: REMOVED';
  RAISE NOTICE '✅ New policies: % CREATED', policy_count;
  RAISE NOTICE '✅ Your role: %', COALESCE(user_role, 'unknown');
  RAISE NOTICE '';

  IF user_role = 'system_admin' THEN
    RAISE NOTICE '🔓 SYSTEM ADMIN PRIVILEGES ACTIVE:';
    RAISE NOTICE '   • View ALL notes from ALL dealerships';
    RAISE NOTICE '   • Create notes for ANY vehicle';
    RAISE NOTICE '   • Update ANY note';
    RAISE NOTICE '   • Delete ANY note';
  ELSIF user_role IS NOT NULL THEN
    RAISE NOTICE '🔒 USER PRIVILEGES:';
    RAISE NOTICE '   • View notes from your dealership';
    RAISE NOTICE '   • Create notes for your dealership vehicles';
    RAISE NOTICE '   • Update your own notes';
    RAISE NOTICE '   • Delete your own notes';
  ELSE
    RAISE NOTICE '⚠️  WARNING: No role assigned to your user';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🚀 NEXT STEPS:';
  RAISE NOTICE '   1. HARD REFRESH browser: Ctrl+Shift+R (Win) / Cmd+Shift+R (Mac)';
  RAISE NOTICE '   2. Clear browser cache if error persists';
  RAISE NOTICE '   3. Go to Get Ready → Details View';
  RAISE NOTICE '   4. Select a vehicle';
  RAISE NOTICE '   5. Go to Notes tab';
  RAISE NOTICE '   6. Create your first note!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

END $$;
